import { env } from './config/config';
import { createContainer } from './container';
import { createLoggerConfig } from './config/logger.config';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { createApp } from './app';
import { promisify } from 'node:util';

const SERVICE_NAME = 'Release Tracker Service';

const logger = new PinoLogger(createLoggerConfig(env, SERVICE_NAME));

async function bootstrap() {
  const container = createContainer(env, { serviceName: SERVICE_NAME, overrides: { logger } });

  await container.prisma.$connect();
  logger.info('Prisma connection established successfully');

  const app = createApp(container);

  const server = app.listen(env.TRACKER_PORT, () => {
    logger.info(`Server is listening on port ${env.TRACKER_PORT}`);
  });

  // await container.consumerManager.start();

  container.jobsManager.startJobs();

  async function shutdown() {
    logger.info('Shutting down...');

    const closeServer = promisify(server.close.bind(server));
    await closeServer();
    logger.info('HTTP server closed.');

    await container.jobsManager.stopJobs();

    // await container.consumerManager.stop();

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
