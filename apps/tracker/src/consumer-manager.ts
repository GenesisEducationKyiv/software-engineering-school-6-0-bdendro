import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { RepositoryCommandConsumer } from './modules/repository/repository-command.consumer';

export class ConsumerManager {
  private isRunning: boolean = false;

  constructor(
    private readonly repositoryCommandConsumer: RepositoryCommandConsumer,
    private readonly logger: AppLogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumers are already started.');
      return;
    }

    await this.repositoryCommandConsumer.start();
    this.logger.info('Repository command consumer successfully started.');

    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Consumers are already stopped.');
      return;
    }

    await this.repositoryCommandConsumer.stop();
    this.logger.info('Repository command consumer successfully stopped.');

    this.isRunning = false;
  }
}
