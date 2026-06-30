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

  const subscriptionRepositoryMapper = new SubscriptionPrismaMapper();
  const subscriptionRepository = new SubscriptionRepository(prisma, subscriptionRepositoryMapper);
  const subscriptionService = null;
  // new SubscriptionService(
  // subscriptionRepository,
  // subscriptionEventProducer,
  // repositoryService,
  // env.APP_BASE_URL,
  // );
  const subscriptionControllerMapper = new SubscriptionControllerMapper();
  const subscriptionController = null;
  // new SubscriptionController(
  //   subscriptionService,
  //   subscriptionControllerMapper,
  // );

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
    logger,
  );

  // Jobs
  // const unconfirmedSubscriptionsCleanupJob = new UnconfirmedSubscriptionsCleanupJob(
  //   logger,
  //   subscriptionService,
  //   ms(env.UNCONFIRMED_EXPIRATION_TIME as ms.StringValue),
  // );

  const jobsManager = { startJobs: () => {}, stopJobs: async () => {} };
  // new JobsManager(unconfirmedSubscriptionsCleanupJob, logger, env);

  // Metrics
  const metricsController = new MetricsController();

  return {
    logger,
    prisma,
    rabbitMqConnection,
    consumerManager,
    jobsManager,
    producers: {
      subscription: { subscriptionBaseMessageProducer, subscriptionEventProducer },
    },
    controllers: { subscriptionController, metricsController },
    services: { subscriptionService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
