import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import {
  createRabbitMqConnection,
  RabbitMqConnection,
} from '../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { Env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { ConsumerManager } from './consumer-manager';
import { EmailController } from './notification/email.controller';
import { EmailProvider } from './notification/email.provider';
import { EmailService } from './notification/email.service';
import { EmailProviderInterface } from './notification/interfaces/email.provider.interface';
import { NotificationRabbitMqEventConsumer } from './notification/notification-rabbitmq.consumer';

type ContainerOverrides = Partial<{
  logger: AppLogger;
  rabbitMqConnection: RabbitMqConnection;
  emailProvider: EmailProviderInterface;
}>;

type ContainerOptions = Partial<{ serviceName: string; overrides: ContainerOverrides }>;

export function createContainer(env: Env, options?: ContainerOptions) {
  const appName = options?.serviceName ?? 'Notification Service';

  const logger =
    options?.overrides?.logger || new PinoLogger({ ...createLoggerConfig(env), appName });

  const rabbitMqConnection =
    options?.overrides?.rabbitMqConnection || createRabbitMqConnection(env.RABBITMQ_URL, logger);

  const emailProvider = options?.overrides?.emailProvider || new EmailProvider(env);
  const emailService = new EmailService(emailProvider);
  const emailController = new EmailController(emailService);

  const notificationEventConsumer = new NotificationRabbitMqEventConsumer(
    rabbitMqConnection,
    emailService,
    logger,
  );
  const consumerManager = new ConsumerManager(notificationEventConsumer, logger);

  return {
    logger,
    rabbitMqConnection,
    emailProvider,
    consumerManager,
    controllers: { emailController },
    services: { emailService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
