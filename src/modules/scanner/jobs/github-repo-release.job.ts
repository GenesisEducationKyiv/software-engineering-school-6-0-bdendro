import { AppLogger } from '../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { JobInterface } from '../../../../libs/common/jobs/interfaces/job.interface';
import { ScannerServiceInterface } from '../interfaces/scanner.service.interface';

export class GithubReleaseNotificationJob implements JobInterface {
  constructor(
    private readonly trackerService: ScannerServiceInterface,
    private readonly logger: AppLogger,
  ) {}
  async run(): Promise<void> {
    this.logger.info('GitHub repository release notification execution.');
    try {
      await this.trackerService.detectReleases();
    } catch (err) {
      this.logger.error({ err }, 'While doing scheduled repository release notification task');
    }
  }
}
