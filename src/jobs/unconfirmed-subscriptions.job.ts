import { AppLogger } from '../common/modules/logger/interfaces/logger.interface';
import { SubscriptionServiceInterface } from '../subscriptions/interfaces/subscription.service.interface';
import { JobInterface } from './interfaces/job.interface';

export class UnconfirmedSubscriptionsCleanupJob implements JobInterface {
  constructor(
    private readonly logger: AppLogger,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly unconfirmedExpirationTimeInMs: number,
  ) {}

  async run(): Promise<void> {
    try {
      const affectedRows = await this.subscriptionService.deleteUnconfirmed(
        this.unconfirmedExpirationTimeInMs,
      );
      this.logger.info(`Scheduled cleanup: ${affectedRows} unconfirmed subscriptions deleted`);
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to delete unconfirmed subscriptions during scheduled cleanup',
      );
    }
  }
}
