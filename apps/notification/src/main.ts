import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { createApp } from './app';
import { env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { createContainer } from './container';
import { EMAIL_VERIFICATION_ERROR_KIND } from './notification/constants/email-provider';

const serviceName = 'Notification Service';
const logger = new PinoLogger({ ...createLoggerConfig(env), appName: serviceName });

async function bootstrap() {
  const container = createContainer(env, { overrides: { logger }, serviceName });

  const emailVerification = await container.emailProvider.verifyTransporter();
  if (!emailVerification.ok) {
    if (emailVerification.kind !== EMAIL_VERIFICATION_ERROR_KIND.AUTH)
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

  const server = app.listen(env.NOTIFICATION_PORT, () => {
    logger.info(`Server is listening on port ${env.NOTIFICATION_PORT}`);
  });

  function shutdown() {
    logger.info('Shutting down...');
    server.close();

    container.emailProvider.closeConnection();
    logger.info('SMTP connection closed successfully.');

    logger.info('Application shut down successfully.');
    process.exit(0);
  }

  process.on('SIGINT', () => {
    try {
      shutdown();
    } catch (err) {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    try {
      shutdown();
    } catch (err) {
      logger.fatal({ err }, 'Shutdown failed.');
      process.exit(1);
    }
  });
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start application.');
  process.exit(1);
});
