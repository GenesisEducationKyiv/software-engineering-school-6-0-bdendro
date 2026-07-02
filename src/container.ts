import ms from 'ms';
import { AppLogger } from '../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../libs/infrastructure/logger/pino-logger';
import { Env } from './config/env';
import { createLoggerConfig } from './config/logger.config';
import { JobsManager } from './jobs-manager';
import { UnconfirmedSubscriptionsCleanupJob } from './modules/subscription/jobs/unconfirmed-subscriptions.job';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { SubscriptionRepository } from './modules/subscription/subscription.repository';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { SubscriptionPrismaMapper } from './modules/subscription/mappers/subscription-prisma.mapper';
import { SubscriptionControllerMapper } from './modules/subscription/mappers/subscription-controller.mapper';
import { MetricsController } from '../libs/infrastructure/metrics/metrics.controller';
import {
  createRabbitMqConnection,
  RabbitMqConnection,
} from '../libs/infrastructure/message-broker/rabbitmq.connection';
import { RabbitMqProducer } from '../libs/infrastructure/message-broker/rabbitmq.producer';
import { MAIN_EXCHANGE } from '../libs/contracts/main/messaging/topology';
import { SubscriptionEventProducer } from './modules/subscription/subscription-event.producer';
import { SubscriptionProducerMapper } from './modules/subscription/mappers/subscription-producer.mapper';
import { ConsumerManager } from './consumer-manager';
import { SubscriptionRepositoryRabbitMqEventConsumer } from './modules/repository/subscription-repository-rabbitmq.consumer';
import { RabbitMqDlxProducer } from '../libs/infrastructure/message-broker/rabbitmq-dlx.producer';
import { SUBSCRIPTION_DLQ, SUBSCRIPTION_DLX } from './common/constants/messaging.const';
import { createPrismaClient, PrismaDBClient } from './infrastructure/database/prisma';
import { SubscriptionRepositoryPrismaMapper } from './modules/repository/mappers/repository-prisma.mapper';
import { SubscriptionRepositoryPrismaRepository } from './modules/repository/repository-prisma.repository';
import { ReleaseDetectedRabbitMqEventConsumer } from './modules/subscription/release-detected-rabbitmq.consumer';
import { SubscribeSagaPrismaRepository } from './modules/subscription/saga/subscribe-saga-prisma.repository';
import { SubscribeSagaPrismaMapper } from './modules/subscription/saga/mappers/subscribe-saga-prisma.mapper';
import { SubscribeSagaCommandProducer } from './modules/subscription/saga/subscribe-saga-command.producer';
import { SubscribeSagaReplyConsumer } from './modules/subscription/saga/subscribe-saga-reply.consumer';

export type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: PrismaDBClient;
  rabbitMqConnection: RabbitMqConnection;
}>;

export function createContainer(env: Env, overrides?: ContainerOverrides) {
  const logger = overrides?.logger || new PinoLogger(createLoggerConfig(env));

  const prisma = overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const rabbitMqConnection =
    overrides?.rabbitMqConnection || createRabbitMqConnection(env.RABBITMQ_URL, logger);

  // Dead letter exchange producer
  const dlxProducer = new RabbitMqDlxProducer(
    rabbitMqConnection,
    SUBSCRIPTION_DLX,
    SUBSCRIPTION_DLQ,
  );

  // Read Repository
  const repositoryPrismaMapper = new SubscriptionRepositoryPrismaMapper();
  const repositoryPrismaRepository = new SubscriptionRepositoryPrismaRepository(
    prisma,
    repositoryPrismaMapper,
  );

  const repositoryRabbitMqEventConsumer = new SubscriptionRepositoryRabbitMqEventConsumer(
    rabbitMqConnection,
    repositoryPrismaRepository,
    dlxProducer,
    logger,
  );

  // Subscription
  const subscriptionProducerMapper = new SubscriptionProducerMapper();
  const subscriptionBaseMessageProducer = new RabbitMqProducer(rabbitMqConnection, MAIN_EXCHANGE);
  const subscriptionEventProducer = new SubscriptionEventProducer(
    subscriptionBaseMessageProducer,
    subscriptionProducerMapper,
  );

  const subscribeSagaRepositoryMapper = new SubscribeSagaPrismaMapper();
  const subscribeSagaRepository = new SubscribeSagaPrismaRepository(
    prisma,
    subscribeSagaRepositoryMapper,
  );
  const subscribeSagaCommandProducer = new SubscribeSagaCommandProducer(rabbitMqConnection);

  const subscriptionRepositoryMapper = new SubscriptionPrismaMapper();
  const subscriptionRepository = new SubscriptionRepository(prisma, subscriptionRepositoryMapper);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    repositoryPrismaRepository,
    subscriptionEventProducer,
    subscribeSagaRepository,
    subscribeSagaCommandProducer,
    env.APP_BASE_URL,
  );
  const subscriptionControllerMapper = new SubscriptionControllerMapper();
  const subscriptionController = new SubscriptionController(
    subscriptionService,
    subscriptionControllerMapper,
  );

  const subscribeSagaReplyConsumer = new SubscribeSagaReplyConsumer(
    rabbitMqConnection,
    subscribeSagaRepository,
    subscribeSagaCommandProducer,
    subscriptionService,
    repositoryPrismaRepository,
    dlxProducer,
    logger,
  );

  const releaseDetectedEventConsumer = new ReleaseDetectedRabbitMqEventConsumer(
    rabbitMqConnection,
    subscriptionService,
    dlxProducer,
    logger,
  );

  // Consumer Manager
  const consumerManager = new ConsumerManager(
    repositoryRabbitMqEventConsumer,
    releaseDetectedEventConsumer,
    subscribeSagaReplyConsumer,
    logger,
  );

  // Jobs
  const unconfirmedSubscriptionsCleanupJob = new UnconfirmedSubscriptionsCleanupJob(
    logger,
    subscriptionService,
    ms(env.UNCONFIRMED_EXPIRATION_TIME as ms.StringValue),
  );

  const jobsManager = { startJobs: () => {}, stopJobs: async () => {} };
  new JobsManager(unconfirmedSubscriptionsCleanupJob, logger, env);

  // Metrics
  const metricsController = new MetricsController();

  return {
    logger,
    prisma,
    rabbitMqConnection,
    consumerManager,
    jobsManager,
    producers: {
      base: { subscriptionBaseMessageProducer },
      subscription: { subscriptionEventProducer, subscribeSagaCommandProducer },
      dlxProducer,
    },
    controllers: { subscriptionController, metricsController },
    services: { subscriptionService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
