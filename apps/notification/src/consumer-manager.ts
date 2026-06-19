import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { NotificationRabbitMqEventConsumer } from './notification/notification-rabbitmq.consumer';

export class ConsumerManager {
  constructor(
    private readonly notificationRabbitMqEventConsumer: NotificationRabbitMqEventConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    await this.notificationRabbitMqEventConsumer.start();
    this.logger.info('Notification consumer successfully started.');
  }

  async stop(): Promise<void> {
    await this.notificationRabbitMqEventConsumer.stop();
    this.logger.info('Notification consumer successfully stopped.');
  }
}
