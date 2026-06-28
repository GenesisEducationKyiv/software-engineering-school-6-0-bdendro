import { AppLogger } from '../libs/infrastructure/logger/interfaces/logger.interface';
import { SubscriptionRepositoryRabbitMqEventConsumer } from './modules/repository/subscription-repository-rabbitmq.consumer';

export class ConsumerManager {
  private isRunning: boolean = false;

  constructor(
    private readonly repositoryRabbitMqEventConsumer: SubscriptionRepositoryRabbitMqEventConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumers are already started.');
      return;
    }

    await this.repositoryRabbitMqEventConsumer.start();
    this.logger.info('Read Repository consumer successfully started.');

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Consumers are already stopped.');
      return;
    }

    await this.repositoryRabbitMqEventConsumer.stop();
    this.logger.info('Read Repository consumer successfully stopped.');

    this.isRunning = false;
  }
}
