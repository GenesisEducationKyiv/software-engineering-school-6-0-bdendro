import ms from 'ms';
import { AppLogger } from './infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from './infrastructure/logger/pino-logger';
import { Env } from './config/env';
import { createLoggerConfig } from './config/logger.config';
import { createPrismaClient, PrismaDBClient } from './infrastructure/database/prisma';
import { EmailProvider } from './modules/notification/email.provider';
import { EmailService } from './modules/notification/email.service';
import { EmailProviderInterface } from './modules/notification/interfaces/email.provider.interface';
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
import { MetricsController } from './infrastructure/metrics/metrics.controller';

export type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: PrismaDBClient;
  emailProvider: EmailProviderInterface;
  githubClient: GithubClientInterface;
}>;

export function createContainer(env: Env, overrides?: ContainerOverrides) {
  const logger = overrides?.logger || new PinoLogger(createLoggerConfig(env));

  const prisma = overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const emailProvider = overrides?.emailProvider || new EmailProvider(env);
  const emailService = new EmailService(emailProvider, env.APP_BASE_URL);

  const githubRateLimiter = new GithubRateLimiter();
  const githubClientMapper = new GithubClientMapper();
  const githubClient =
    overrides?.githubClient || new GithubClient(githubRateLimiter, githubClientMapper, env);
  const githubService = new GithubService(githubClient);

  const subscriptionRepositoryMapper = new SubscriptionPrismaMapper();
  const subscriptionRepository = new SubscriptionRepository(prisma, subscriptionRepositoryMapper);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    emailService,
    githubService,
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
    emailService,
    githubRateLimiter,
    logger,
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
    emailProvider,
    githubRateLimiter,
    jobsManager,
    controllers: { subscriptionController, metricsController },
    services: { subscriptionService, emailService, githubService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
