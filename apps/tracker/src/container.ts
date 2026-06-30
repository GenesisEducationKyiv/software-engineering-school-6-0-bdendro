import { TRACKER_EXCHANGE } from '../../../libs/contracts/tracker/messaging/topology';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import {
  createRabbitMqConnection,
  RabbitMqConnection,
} from '../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { RabbitMqProducer } from '../../../libs/infrastructure/message-broker/rabbitmq.producer';
import type { Env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { createPrismaClient, PrismaDBClient } from './infrastructure/database/prisma';
import { JobsManager } from './jobs-manager';
import { GithubClient } from './modules/github/github.client';
import { GithubService } from './modules/github/github.service';
import { GithubClientInterface } from './modules/github/interfaces/github.client.interface';
import { GithubClientMapper } from './modules/github/mappers/github-client.mapper';
import { GithubRateLimiter } from './modules/github/utils/github-rate-limiter';
import { RepositoryPrismaMapper } from './modules/repository/mappers/repository-prisma.mapper';
import { RepositoryEventProducer } from './modules/repository/repository-event.producer';
import { RepositoryPrismaRepository } from './modules/repository/repository-prisma.repository';
import { RepositoryService } from './modules/repository/repository.service';
import { GithubReleaseNotificationJob } from './modules/scanner/jobs/github-repo-release.job';
import { ScannerProducerMapper } from './modules/scanner/mappers/scanner-producer.mapper';
import { ScannerEventProducer } from './modules/scanner/scanner-event.producer';
import { ScannerService } from './modules/scanner/scanner.service';

type ContainerOverrides = Partial<{
  logger: AppLogger;
  prisma: PrismaDBClient;
  rabbitMqConnection: RabbitMqConnection;
  githubClient: GithubClientInterface;
}>;

type ContainerOptions = Partial<{ serviceName: string; overrides: ContainerOverrides }>;

export function createContainer(env: Env, options?: ContainerOptions) {
  const logger =
    options?.overrides?.logger ||
    new PinoLogger(createLoggerConfig(env, options?.serviceName ?? ''));

  const prisma = options?.overrides?.prisma || createPrismaClient(env.DATABASE_URL);

  const rabbitMqConnection =
    options?.overrides?.rabbitMqConnection || createRabbitMqConnection(env.RABBITMQ_URL, logger);

  // GitHub
  const githubRateLimiter = new GithubRateLimiter();
  const githubClientMapper = new GithubClientMapper();
  const githubClient =
    options?.overrides?.githubClient ||
    new GithubClient(githubRateLimiter, githubClientMapper, env);
  const githubService = new GithubService(githubClient);

  // Repository
  const repositoryBaseMessageProducer = new RabbitMqProducer(rabbitMqConnection, TRACKER_EXCHANGE);
  const repositoryEventProducer = new RepositoryEventProducer(repositoryBaseMessageProducer);

  const repositoryRepositoryMapper = new RepositoryPrismaMapper();
  const repositoryRepository = new RepositoryPrismaRepository(prisma, repositoryRepositoryMapper);
  const repositoryService = new RepositoryService(
    repositoryRepository,
    githubService,
    repositoryEventProducer,
  );

  // Scanner event producer
  const scannerBaseMessageProducer = new RabbitMqProducer(rabbitMqConnection, TRACKER_EXCHANGE);

  const scannerProducerMapper = new ScannerProducerMapper();
  const scannerEventProducer = new ScannerEventProducer(
    scannerBaseMessageProducer,
    scannerProducerMapper,
  );

  // Scanner
  const scannerService = new ScannerService(
    repositoryService,
    githubService,
    scannerEventProducer,
    logger,
  );

  // Jobs
  const githubRepositoryReleaseJob = new GithubReleaseNotificationJob(scannerService, logger);

  const jobsManager = new JobsManager(githubRepositoryReleaseJob, logger, env);

  return {
    logger,
    prisma,
    rabbitMqConnection,
    githubRateLimiter,
    jobsManager,
    producers: {
      base: { trackerBaseMessageProducer: scannerBaseMessageProducer },
      scanner: { scannerEventProducer },
    },
    services: { githubService, repositoryService, scannerService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
