import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { NotificationRabbitMqEventConsumer } from './notification/notification-rabbitmq.consumer';

export class ConsumerManager {
  private isRunning: boolean = false;

  constructor(
    private readonly notificationRabbitMqEventConsumer: NotificationRabbitMqEventConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumers are already started.');
      return;
    }

    await this.notificationRabbitMqEventConsumer.start();
    this.logger.info('Notification consumer successfully started.');

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Consumers are already stopped.');
      return;
    }

    await this.notificationRabbitMqEventConsumer.stop();
    this.logger.info('Notification consumer successfully stopped.');

    this.isRunning = false;
  }
}
