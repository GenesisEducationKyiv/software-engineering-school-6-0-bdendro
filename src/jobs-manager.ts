import cron, { ScheduledTask } from 'node-cron';
import { SCHEDULE } from '../libs/common/jobs/constants/schedule.const';
import type { Env } from './config/env';
import { AppLogger } from '../libs/infrastructure/logger/interfaces/logger.interface';
import { UnconfirmedSubscriptionsCleanupJob } from './modules/subscription/jobs/unconfirmed-subscriptions.job';

export class JobsManager {
  private unconfirmedSubscriptionsCleanupTask?: ScheduledTask;

  constructor(
    private readonly unconfirmedSubscriptionsCleanupJob: UnconfirmedSubscriptionsCleanupJob,
    private readonly logger: AppLogger,
    private readonly env: Env,
  ) {}

  startJobs() {
    if (this.unconfirmedSubscriptionsCleanupTask) {
      this.logger.warn('Cron jobs are already started.');
      return;
    }

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
    if (this.unconfirmedSubscriptionsCleanupTask)
      await this.unconfirmedSubscriptionsCleanupTask.destroy();
    this.logger.info('Delete unconfirmed subscriptions job successfully stopped.');
  }
}
