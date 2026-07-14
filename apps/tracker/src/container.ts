import { TRACKER_EXCHANGE } from '../../../libs/contracts/tracker/messaging/topology';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { RabbitMqDlxProducer } from '../../../libs/infrastructure/message-broker/rabbitmq-dlx.producer';
import {
  createRabbitMqConnection,
  RabbitMqConnection,
} from '../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { RabbitMqProducer } from '../../../libs/infrastructure/message-broker/rabbitmq.producer';
import { TRACKER_DLQ, TRACKER_DLX } from './common/constants/messaging.const';
import type { Env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { ConsumerManager } from './consumer-manager';
import { createPrismaClient, PrismaDBClient } from './infrastructure/database/prisma';
import { JobsManager } from './jobs-manager';
import { GithubClient } from './modules/github/github.client';
import { GithubService } from './modules/github/github.service';
import { GithubClientInterface } from './modules/github/interfaces/github.client.interface';
import { GithubClientMapper } from './modules/github/mappers/github-client.mapper';
import { GithubRateLimiter } from './modules/github/utils/github-rate-limiter';
import { RepositoryPrismaMapper } from './modules/repository/mappers/repository-prisma.mapper';
import { RepositoryReplyProducerMapper } from './modules/repository/mappers/repository-reply-producer.mapper';
import { RepositoryCommandConsumer } from './modules/repository/repository-command.consumer';
import { RepositoryEventProducer } from './modules/repository/repository-event.producer';
import { RepositoryPrismaRepository } from './modules/repository/repository-prisma.repository';
import { RepositoryReplyRabbitMqProducer } from './modules/repository/repository-reply.producer';
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

  // Dead letter exchange producer
  const dlxProducer = new RabbitMqDlxProducer(rabbitMqConnection, TRACKER_DLX, TRACKER_DLQ);

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

  // Repository command consumer
  const repositoryReplyMapper = new RepositoryReplyProducerMapper();
  const repositoryReplyProducer = new RepositoryReplyRabbitMqProducer(
    rabbitMqConnection,
    repositoryReplyMapper,
  );
  const repositoryCommandConsumer = new RepositoryCommandConsumer(
    rabbitMqConnection,
    repositoryService,
    repositoryReplyProducer,
    dlxProducer,
    logger,
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

  // Consumer Manager
  const consumerManager = new ConsumerManager(repositoryCommandConsumer, logger);

  // Jobs
  const githubRepositoryReleaseJob = new GithubReleaseNotificationJob(scannerService, logger);

  const jobsManager = new JobsManager(githubRepositoryReleaseJob, logger, env);

  return {
    logger,
    prisma,
    rabbitMqConnection,
    githubRateLimiter,
    consumerManager,
    jobsManager,
    producers: {
      base: { scannerBaseMessageProducer, repositoryBaseMessageProducer },
      scanner: { scannerEventProducer },
      repository: { repositoryEventProducer, repositoryReplyProducer },
      dlxProducer,
    },
    services: { githubService, repositoryService, scannerService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
