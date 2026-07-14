import { promisify } from 'node:util';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { createApp } from './app';
import { createContainer } from './container';
import { createLoggerConfig } from './config/logger.config';
import { env } from './config/config';
import { GrpcAppServer } from './app.grpc';
import { GithubServiceServer } from '../../../libs/contracts/grpc/github/v1/github';

const GITHUB_SERVICE_NAME = 'GitHub Service';
const logger = new PinoLogger({ ...createLoggerConfig(env, ''), appName: GITHUB_SERVICE_NAME });

async function bootstrap() {
  const container = createContainer(env, {
    overrides: { logger },
    serviceName: GITHUB_SERVICE_NAME,
  });

  const app = createApp(container);

  const grpcApp = new GrpcAppServer(
    container.grpcHandlers.githubGrpcHandler as unknown as GithubServiceServer,
    logger,
  );

  const server = app.listen(env.GITHUB_PORT, () => {
    logger.info(`Server is listening on port ${env.GITHUB_PORT}`);
  });

  const gprcAddress = `0.0.0.0:${env.GITHUB_GRPC_PORT}`;
  await grpcApp.start(gprcAddress);

  async function shutdown() {
    logger.info('Shutting down...');
    const closeServer = promisify(server.close.bind(server));
    await closeServer();
    logger.info('HTTP server closed.');

    await grpcApp.close();

    logger.info('Application shut down successfully.');
    process.exit(0);
  }

  process.on('SIGINT', () => {
    shutdown().catch((err: unknown) => {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown().catch((err: unknown) => {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    });
  });
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start application.');
  process.exit(1);
});
