import { env } from './config/env';
import { createApp } from './app';
import { createContainer } from './container';
import { EMAIL_VERIFICATION_ERROR_KIND } from './email/constants/email-provider';
import { createLogger } from './config/logger';

const logger = createLogger(env.NODE_ENV, env.APP_NAME);

async function bootstrap() {
  const container = createContainer(env, { logger });

  await container.prisma.$connect();
  logger.info('Prisma connection established successfully');

  const emailVerification = await container.emailProvider.verifyTransporter();
  if (!emailVerification.ok) {
    if (emailVerification.kind !== EMAIL_VERIFICATION_ERROR_KIND.CONNECTION)
      throw new Error('SMTP authentication failed. Check email credentials.', {
        cause: emailVerification.error,
      });

    logger.warn(
      { err: emailVerification.error, kind: emailVerification.kind },
      `SMTP is currently unavailable. Server will start without verified email connectivity.`,
    );
  } else {
    logger.info('SMTP connection successful. Email transporter is ready.');
  }

  const app = createApp(container);

  container.jobsManager.startJobs();

  const server = app.listen(env.APP_PORT, () => {
    logger.info(`Express server is listening on port ${env.APP_PORT}`);
  });

  async function shutdown() {
    logger.info('Shutting down...');
    server.close();

    await container.prisma.$disconnect();
    container.emailProvider.closeConnection();
    await container.jobsManager.stopJobs();

    logger.info('Application shut down successfully.');
    process.exit(0);
  }

  process.on('SIGINT', () => {
    shutdown().catch((err) => {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown().catch((err) => {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    });
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start application.');
  process.exit(1);
});
