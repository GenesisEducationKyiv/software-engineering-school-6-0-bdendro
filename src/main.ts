import { promisify } from 'node:util';
import { env } from './config/env';
import { createApp } from './app';
import { createContainer } from './container';
import { createLoggerConfig } from './config/logger.config';
import { PinoLogger } from '../libs/infrastructure/logger/pino-logger';

const logger = new PinoLogger(createLoggerConfig(env));

async function bootstrap() {
  const container = createContainer(env, { logger });

  await container.prisma.$connect();
  logger.info('Prisma connection established successfully');

  const app = createApp(container);

  container.jobsManager.startJobs();

  const server = app.listen(env.APP_PORT, () => {
    logger.info(`Express server is listening on port ${env.APP_PORT}`);
  });

  async function shutdown() {
    logger.info('Shutting down...');
    const closeServer = promisify(server.close.bind(server));
    await closeServer();
    logger.info('HTTP server closed.');

    await container.jobsManager.stopJobs();

    await container.rabbitMqConnection.close();
    logger.info(`RabbitMQ connection successfully closed.`);

    await container.prisma.$disconnect();
    logger.info('Prisma connection closed successfully.');

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
