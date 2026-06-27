import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';

export class ConsumerManager {
  private isRunning: boolean = false;

  constructor(
    // private readonly notificationRabbitMqEventConsumer: NotificationRabbitMqEventConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumers are already started.');
      return;
    }

    // todo: remove
    await Promise.resolve();
    // await this.notificationRabbitMqEventConsumer.start();
    // this.logger.info('Notification consumer successfully started.');

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Consumers are already stopped.');
      return;
    }

    // todo: remove
    await Promise.resolve();
    // await this.notificationRabbitMqEventConsumer.stop();
    // this.logger.info('Notification consumer successfully stopped.');

    this.isRunning = false;
  }
}
