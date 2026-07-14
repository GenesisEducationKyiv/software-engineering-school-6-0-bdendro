import { AppLogger } from '../libs/infrastructure/logger/interfaces/logger.interface';
import { SubscriptionRepositoryRabbitMqEventConsumer } from './modules/repository/subscription-repository-rabbitmq.consumer';
import { ReleaseDetectedRabbitMqEventConsumer } from './modules/subscription/release-detected-rabbitmq.consumer';
import { SubscribeSagaReplyConsumer } from './modules/subscription/saga/subscribe-saga-reply.consumer';

export class ConsumerManager {
  private isRunning: boolean = false;

  constructor(
    private readonly repositoryRabbitMqEventConsumer: SubscriptionRepositoryRabbitMqEventConsumer,
    private readonly releaseDetectedRabbitMqEventConsumer: ReleaseDetectedRabbitMqEventConsumer,
    private readonly subscribeSagaReplyConsumer: SubscribeSagaReplyConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumers are already started.');
      return;
    }

    await this.repositoryRabbitMqEventConsumer.start();
    this.logger.info('Read Repository consumer successfully started.');

    await this.releaseDetectedRabbitMqEventConsumer.start();
    this.logger.info('Release detected consumer successfully started.');

    await this.subscribeSagaReplyConsumer.start();
    this.logger.info('Subscribe saga consumer successfully started.');

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Consumers are already stopped.');
      return;
    }

    await this.repositoryRabbitMqEventConsumer.stop();
    this.logger.info('Read Repository consumer successfully stopped.');

    await this.releaseDetectedRabbitMqEventConsumer.stop();
    this.logger.info('Release detected consumer successfully stopped.');

    await this.subscribeSagaReplyConsumer.start();
    this.logger.info('Subscribe saga consumer successfully started.');

    this.isRunning = false;
  }
}
