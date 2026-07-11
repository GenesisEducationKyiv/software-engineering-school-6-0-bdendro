import cron, { ScheduledTask } from 'node-cron';
import { SCHEDULE } from './constants/schedule.const';
import type { Env } from '../config/env';
import { AppLogger } from '../common/modules/logger/interfaces/logger.interface';
import { GithubReleaseNotificationJob } from './github-repo-release.job';
import { UnconfirmedSubscriptionsCleanupJob } from './unconfirmed-subscriptions.job';

export class JobsManager {
  private githubReleaseNotificationTask?: ScheduledTask;
  private unconfirmedSubscriptionsCleanupTask?: ScheduledTask;

  constructor(
    private readonly githubReleaseNotificationJob: GithubReleaseNotificationJob,
    private readonly unconfirmedSubscriptionsCleanupJob: UnconfirmedSubscriptionsCleanupJob,
    private readonly logger: AppLogger,
    private readonly env: Env,
  ) {}

  startJobs() {
    if (this.githubReleaseNotificationTask || this.unconfirmedSubscriptionsCleanupTask) {
      this.logger.warn('Cron jobs are already started.');
      return;
    }

    this.githubReleaseNotificationTask = cron.schedule(
      SCHEDULE.EVERY_10_MINUTES,
      () => this.githubReleaseNotificationJob.run(),
      {
        timezone: this.env.APP_TIMEZONE,
        noOverlap: true,
      },
    );
    this.logger.info('GitHub release notifications job successfully started.');

    this.unconfirmedSubscriptionsCleanupTask = cron.schedule(
      SCHEDULE.EVERY_5_MINUTES,
      () => this.unconfirmedSubscriptionsCleanupJob.run(),
      {
        timezone: this.env.APP_TIMEZONE,
        noOverlap: true,
      },
    );
    this.logger.info('Delete unconfirmed subscriptions job successfully started.');
  }

  async stopJobs() {
    if (this.githubReleaseNotificationTask) await this.githubReleaseNotificationTask.destroy();
    this.logger.info('GitHub release notifications job successfully stopped.');

    if (this.unconfirmedSubscriptionsCleanupTask)
      await this.unconfirmedSubscriptionsCleanupTask.destroy();
    this.logger.info('Delete unconfirmed subscriptions job successfully stopped.');
  }
}
