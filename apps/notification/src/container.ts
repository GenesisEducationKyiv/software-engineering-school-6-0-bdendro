import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { PinoLogger } from '../../../libs/infrastructure/logger/pino-logger';
import { Env } from './config/config';
import { createLoggerConfig } from './config/logger.config';
import { EmailController } from './notification/email.controller';
import { EmailProvider } from './notification/email.provider';
import { EmailService } from './notification/email.service';
import { EmailProviderInterface } from './notification/interfaces/email.provider.interface';

type ContainerOverrides = Partial<{
  logger: AppLogger;
  emailProvider: EmailProviderInterface;
}>;

type ContainerOptions = Partial<{ serviceName: string; overrides: ContainerOverrides }>;

export function createContainer(env: Env, options?: ContainerOptions) {
  const appName = options?.serviceName ?? 'Notification Service';

  const logger =
    options?.overrides?.logger || new PinoLogger({ ...createLoggerConfig(env), appName });

  const emailProvider = options?.overrides?.emailProvider || new EmailProvider(env);
  const emailService = new EmailService(emailProvider);
  const emailController = new EmailController(emailService);

  return {
    logger,
    emailProvider,
    controllers: { emailController },
    services: { emailService },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
