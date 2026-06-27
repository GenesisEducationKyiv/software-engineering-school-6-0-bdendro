import cron, { ScheduledTask } from 'node-cron';
import { SCHEDULE } from '../../../libs/common/jobs/constants/schedule.const';
import type { Env } from './config/config';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { GithubReleaseNotificationJob } from './modules/scanner/jobs/github-repo-release.job';

export class JobsManager {
  private githubReleaseNotificationTask?: ScheduledTask;

  constructor(
    private readonly githubReleaseNotificationJob: GithubReleaseNotificationJob,
    private readonly logger: AppLogger,
    private readonly env: Env,
  ) {}

  startJobs() {
    if (this.githubReleaseNotificationTask) {
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
  }

  async stopJobs() {
    if (this.githubReleaseNotificationTask) await this.githubReleaseNotificationTask.destroy();
    this.logger.info('GitHub release notifications job successfully stopped.');
  }
}
