import ms from 'ms';
import { AppLogger } from '../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../libs/infrastructure/logger/pino-logger';
import { Env } from './config/env';
import { createLoggerConfig } from './config/logger.config';
import { createPrismaClient, PrismaDBClient } from './infrastructure/database/prisma';
import { GithubClient } from './modules/github/github.client';
import { GithubService } from './modules/github/github.service';
import { GithubClientInterface } from './modules/github/interfaces/github.client.interface';
import { GithubRateLimiter } from './modules/github/utils/github-rate-limiter';
import { GithubReleaseNotificationJob } from './modules/scanner/jobs/github-repo-release.job';
import { JobsManager } from './jobs-manager';
import { UnconfirmedSubscriptionsCleanupJob } from './modules/subscription/jobs/unconfirmed-subscriptions.job';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { SubscriptionRepository } from './modules/subscription/subscription.repository';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { GithubClientMapper } from './modules/github/mappers/github-client.mapper';
import { SubscriptionPrismaMapper } from './modules/subscription/mappers/subscription-prisma.mapper';
import { SubscriptionControllerMapper } from './modules/subscription/mappers/subscription-controller.mapper';
import { MetricsController } from '../libs/infrastructure/metrics/metrics.controller';
import {
  createRabbitMqConnection,
  RabbitMqConnection,
} from '../libs/infrastructure/message-broker/rabbitmq.connection';
import { RabbitMqProducer } from '../libs/infrastructure/message-broker/rabbitmq.producer';
import { MAIN_EXCHANGE } from '../libs/contracts/main/events/exchanges';
import { SubscriptionEventProducer } from './modules/subscription/subscription-event.producer';
import { SubscriptionProducerMapper } from './modules/subscription/mappers/subscription-producer.mapper';
import { ScannerService } from './modules/scanner/scanner.service';
import { RepositoryPrismaRepository } from './modules/repository/repository-prisma.repository';
import { RepositoryPrismaMapper } from './modules/repository/mappers/repository-prisma.mapper';
import { RepositoryService } from './modules/repository/repository.service';

export type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: PrismaDBClient;
  rabbitMqConnection: RabbitMqConnection;
  githubClient: GithubClientInterface;
}>;

export function createContainer(env: Env, overrides?: ContainerOverrides) {
  const logger = overrides?.logger || new PinoLogger(createLoggerConfig(env));

  const prisma = overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const rabbitMqConnection =
    overrides?.rabbitMqConnection || createRabbitMqConnection(env.RABBITMQ_URL, logger);

  // GitHub
  const githubRateLimiter = new GithubRateLimiter();
  const githubClientMapper = new GithubClientMapper();
  const githubClient =
    overrides?.githubClient || new GithubClient(githubRateLimiter, githubClientMapper, env);
  const githubService = new GithubService(githubClient);

  // Repository
  const repositoryRepositoryMapper = new RepositoryPrismaMapper();
  const repositoryRepository = new RepositoryPrismaRepository(prisma, repositoryRepositoryMapper);
  const repositoryService = new RepositoryService(repositoryRepository, githubService);

  // Subscription
  const subscriptionProducerMapper = new SubscriptionProducerMapper();
  const subscriptionBaseMessageProducer = new RabbitMqProducer(rabbitMqConnection, MAIN_EXCHANGE);
  const subscriptionEventProducer = new SubscriptionEventProducer(
    subscriptionBaseMessageProducer,
    subscriptionProducerMapper,
  );

  const subscriptionRepositoryMapper = new SubscriptionPrismaMapper();
  const subscriptionRepository = new SubscriptionRepository(prisma, subscriptionRepositoryMapper);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    subscriptionEventProducer,
    repositoryService,
    env.APP_BASE_URL,
  );
  const subscriptionControllerMapper = new SubscriptionControllerMapper();
  const subscriptionController = new SubscriptionController(
    subscriptionService,
    subscriptionControllerMapper,
  );

  // Tracker
  const scannerService = new ScannerService(
    subscriptionService,
    repositoryService,
    githubService,
    subscriptionEventProducer,
    logger,
    env.APP_BASE_URL,
  );

  // Jobs
  const githubRepositoryReleaseJob = new GithubReleaseNotificationJob(scannerService, logger);

  const unconfirmedSubscriptionsCleanupJob = new UnconfirmedSubscriptionsCleanupJob(
    logger,
    subscriptionService,
    ms(env.UNCONFIRMED_EXPIRATION_TIME as ms.StringValue),
  );

  const jobsManager = new JobsManager(
    githubRepositoryReleaseJob,
    unconfirmedSubscriptionsCleanupJob,
    logger,
    env,
  );

  // Metrics
  const metricsController = new MetricsController();

  return {
    logger,
    prisma,
    rabbitMqConnection,
    githubRateLimiter,
    jobsManager,
    producers: {
      subscription: { subscriptionBaseMessageProducer, subscriptionEventProducer },
    },
    controllers: { subscriptionController, metricsController },
    services: { subscriptionService, githubService, repositoryService, scannerService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
