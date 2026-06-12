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
import { GithubReleaseNotificationJob } from './modules/subscription/jobs/github-repo-release.job';
import { JobsManager } from './jobs/manager';
import { UnconfirmedSubscriptionsCleanupJob } from './modules/subscription/jobs/unconfirmed-subscriptions.job';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { SubscriptionRepository } from './modules/subscription/subscription.repository';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { GithubClientMapper } from './modules/github/mappers/github-client.mapper';
import { SubscriptionPrismaMapper } from './modules/subscription/mappers/subscription-prisma.mapper';
import { SubscriptionControllerMapper } from './modules/subscription/mappers/subscription-controller.mapper';
import { MetricsController } from '../libs/infrastructure/metrics/metrics.controller';
import { SubscriptionNotificationSenderInterface } from './infrastructure/notification/interfaces/subscription-email.service.interface';
import { RepositoryReleaseNotificationSenderInterface } from './infrastructure/notification/interfaces/repository-release-email.sender.interface';
import { NotificationClient } from './infrastructure/notification/notification.client';
import { NotificationClientMapper } from './infrastructure/notification/notification.mapper';

type NotificationSender = SubscriptionNotificationSenderInterface &
  RepositoryReleaseNotificationSenderInterface;

export type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: PrismaDBClient;
  notificationClient: NotificationSender;
  githubClient: GithubClientInterface;
}>;

export function createContainer(env: Env, overrides?: ContainerOverrides) {
  const logger = overrides?.logger || new PinoLogger(createLoggerConfig(env));

  const prisma = overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const notificationMapper = new NotificationClientMapper();
  const notificationClient =
    overrides?.notificationClient || new NotificationClient(env, notificationMapper);

  const githubRateLimiter = new GithubRateLimiter();
  const githubClientMapper = new GithubClientMapper();
  const githubClient =
    overrides?.githubClient || new GithubClient(githubRateLimiter, githubClientMapper, env);
  const githubService = new GithubService(githubClient);

  const subscriptionRepositoryMapper = new SubscriptionPrismaMapper();
  const subscriptionRepository = new SubscriptionRepository(prisma, subscriptionRepositoryMapper);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    notificationClient,
    githubService,
    env.APP_BASE_URL,
  );
  const subscriptionControllerMapper = new SubscriptionControllerMapper();
  const subscriptionController = new SubscriptionController(
    subscriptionService,
    subscriptionControllerMapper,
  );

  const metricsController = new MetricsController();

  const githubRepositoryReleaseJob = new GithubReleaseNotificationJob(
    githubService,
    subscriptionService,
    notificationClient,
    githubRateLimiter,
    logger,
    env.APP_BASE_URL,
  );

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

  return {
    logger,
    prisma,
    notificationClient,
    githubRateLimiter,
    jobsManager,
    controllers: { subscriptionController, metricsController },
    services: { subscriptionService, githubService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
