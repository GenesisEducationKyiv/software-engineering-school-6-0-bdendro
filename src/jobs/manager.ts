import cron, { ScheduledTask } from 'node-cron';
import { SCHEDULE } from './constants/schedule.const';
import { GithubRepositoryReleaseJobInterface } from './github-repo-release.job';
import type { Env } from '../config/env';
import { SubscriptionServiceInterface } from '../subscriptions/interfaces/subscription.service.interface';
import { AppLogger } from '../common/modules/logger/interfaces/logger.interface';

export class JobsManager {
  private githubReleaseNotificationsJob?: ScheduledTask;
  private deleteUnconfirmedSubscriptionsJob?: ScheduledTask;

  constructor(
    private readonly githubRepositoryReleaseJob: GithubRepositoryReleaseJobInterface,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly logger: AppLogger,
    private readonly env: Env,
  ) {}

  startJobs() {
    this.githubReleaseNotificationsJob = cron.schedule(
      SCHEDULE.EVERY_10_MINUTES,
      () => this.githubRepositoryReleaseJob.run(),
      {
        timezone: this.env.APP_TIMEZONE,
      },
    );
    this.logger.info('GitHub release notifications job successfully started.');

    this.deleteUnconfirmedSubscriptionsJob = cron.schedule(
      SCHEDULE.EVERY_5_MINUTES,
      async () => {
        try {
          const affectedRows = await this.subscriptionService.deleteUnconfirmed(
            this.env.UNCONFIRMED_EXPIRATION_TIME,
          );
          this.logger.info(`Scheduled cleanup: ${affectedRows} unconfirmed subscriptions deleted`);
        } catch (err) {
          this.logger.error(
            { err },
            'Failed to delete unconfirmed subscriptions during scheduled cleanup',
          );
        }
      },
      { timezone: this.env.APP_TIMEZONE },
    );
    this.logger.info('Delete unconfirmed subscriptions job successfully started.');
  }

  async stopJobs() {
    if (this.githubReleaseNotificationsJob) await this.githubReleaseNotificationsJob.destroy();
    this.logger.info('GitHub release notifications job successfully stopped.');

    if (this.deleteUnconfirmedSubscriptionsJob)
      await this.deleteUnconfirmedSubscriptionsJob.destroy();
    this.logger.info('Delete unconfirmed subscriptions job successfully stopped.');
  }
}
