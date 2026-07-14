import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { Env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { GithubClient } from './github/github.client';
import { GithubController } from './github/github.controller';
import { GithubGrpcHandler } from './github/github.grpc.handler';
import { GithubService } from './github/github.service';
import { GithubClientInterface } from './github/interfaces/github.client.interface';
import { GithubClientMapper } from './github/mappers/github-client.mapper';
import { GithubRateLimiter } from './github/utils/github-rate-limiter';

type ContainerOverrides = Partial<{
  logger: AppLogger;
  githubClient: GithubClientInterface;
}>;

type ContainerOptions = Partial<{ serviceName: string; overrides: ContainerOverrides }>;

export function createContainer(env: Env, options?: ContainerOptions) {
  const appName = options?.serviceName ?? 'Notification Service';

  const logger = options?.overrides?.logger || new PinoLogger(createLoggerConfig(env, appName));

  // GitHub
  const githubRateLimiter = new GithubRateLimiter();
  const githubClientMapper = new GithubClientMapper();
  const githubClient =
    options?.overrides?.githubClient ||
    new GithubClient(githubRateLimiter, githubClientMapper, env);
  const githubService = new GithubService(githubClient);
  const githubController = new GithubController(githubService);

  const githubGrpcHandler = new GithubGrpcHandler(githubService, logger);

  return {
    logger,
    githubClient,
    grpcHandlers: { githubGrpcHandler },
    controllers: { githubController },
    services: { githubService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
