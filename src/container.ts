import ms from 'ms';
import { AppLogger } from './common/modules/logger/interfaces/logger.interface';
import { PinoLogger } from './common/modules/logger/pino-logger';
import { Env } from './config/env';
import { createLoggerConfig } from './config/logger';
import { createPrismaClient, DBClient } from './config/prisma';
import { EmailProvider } from './email/email.provider';
import { EmailService } from './email/email.service';
import { EmailProviderInterface } from './email/interfaces/email.provider.interface';
import { GithubClient } from './github/github.client';
import { GithubService } from './github/github.service';
import { GithubClientInterface } from './github/interfaces/github.client.interface';
import { GithubRateLimiter } from './github/utils/github-rate-limiter';
import { GithubReleaseNotificationJob } from './jobs/github-repo-release.job';
import { JobsManager } from './jobs/manager';
import { UnconfirmedSubscriptionsCleanupJob } from './jobs/unconfirmed-subscriptions.job';
import { SubscriptionController } from './subscriptions/subscription.controller';
import { SubscriptionRepository } from './subscriptions/subscription.repository';
import { SubscriptionService } from './subscriptions/subscription.service';

export type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: DBClient;
  emailProvider: EmailProviderInterface;
  githubClient: GithubClientInterface;
}>;

export function createContainer(env: Env, overrides?: ContainerOverrides) {
  const logger = overrides?.logger || new PinoLogger(createLoggerConfig(env));

  const prisma = overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const emailProvider = overrides?.emailProvider || new EmailProvider(env);
  const emailService = new EmailService(emailProvider, env.APP_BASE_URL);

  const githubRateLimiter = new GithubRateLimiter();
  const githubClient = overrides?.githubClient || new GithubClient(githubRateLimiter, env);
  const githubService = new GithubService(githubClient);

  const subscriptionRepository = new SubscriptionRepository(prisma);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    emailService,
    githubService,
  );
  const subscriptionController = new SubscriptionController(subscriptionService);

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
    controllers: { subscriptionController },
    services: { subscriptionService, emailService, githubService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
