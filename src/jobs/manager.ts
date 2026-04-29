import cron, { ScheduledTask } from 'node-cron';
import { SCHEDULE } from './constants/schedule.const';
import { GithubRepositoryReleaseJobInterface } from './github-repo-release.job';
import { env } from '../config/env';
import { SubscriptionServiceInterface } from '../subscriptions/interfaces/subscription.service.interface';

export class JobsManager {
  private githubReleaseNotificationsJob?: ScheduledTask;
  private deleteUnconfirmedSubscriptionsJob?: ScheduledTask;

  constructor(
    private readonly githubRepositoryReleaseJob: GithubRepositoryReleaseJobInterface,
    private readonly subscriptionService: SubscriptionServiceInterface,
  ) {}

  startJobs() {
    this.githubReleaseNotificationsJob = cron.schedule(
      SCHEDULE.EVERY_10_MINUTES,
      () => this.githubRepositoryReleaseJob.run(),
      {
        timezone: env.APP_TIMEZONE,
      },
    );

    this.deleteUnconfirmedSubscriptionsJob = cron.schedule(
      SCHEDULE.EVERY_5_MINUTES,
      async () => {
        try {
          const affectedRows = await this.subscriptionService.deleteUnconfirmed(
            env.UNCONFIRMED_EXPIRATION_TIME,
          );
          console.log(
            `[${new Date().toISOString()}] Scheduled cleanup: ${affectedRows} unconfirmed subscriptions deleted`,
          );
        } catch (err) {
          console.error(`Failed to delete unconfirmed subscriptions during scheduled cleanup`, err);
        }
      },
      { timezone: env.APP_TIMEZONE },
    );
  }

  async stopJobs() {
    if (this.githubReleaseNotificationsJob) await this.githubReleaseNotificationsJob.destroy();
    if (this.deleteUnconfirmedSubscriptionsJob)
      await this.deleteUnconfirmedSubscriptionsJob.destroy();
  }
}
