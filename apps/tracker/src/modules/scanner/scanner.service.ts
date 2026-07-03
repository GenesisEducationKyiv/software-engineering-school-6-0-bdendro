import { NotFoundError } from '../../../../../libs/common/utils/errors/custom-errors';
import { AppLogger } from '../../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { GithubClientInterface } from '../github';
import { RepositoryServiceInterface } from '../repository';
import { RepositoryReleaseEventProducerInterface } from './interfaces/scanner-event.producer.interface';
import { ScannerServiceInterface } from './interfaces/scanner.service.interface';

export class ScannerService implements ScannerServiceInterface {
  constructor(
    private readonly repositoryService: RepositoryServiceInterface,
    private readonly githubClient: GithubClientInterface,
    private readonly eventProducer: RepositoryReleaseEventProducerInterface,
    private readonly logger: AppLogger,
  ) {}

  async detectReleases(): Promise<void> {
    const repositories = await this.repositoryService.getAll();

    for (const repo of repositories) {
      const release = await this.githubClient.getLatestRelease(repo.repo);
      if (release !== null && release.tagName !== repo.lastSeenTag) {
        try {
          await this.repositoryService.updateTag(repo.id, release.tagName);
        } catch (err) {
          if (err instanceof NotFoundError)
            this.logger.info({ err }, 'Error while trying to update repository lastSeenTag');

          throw err;
        }

        await this.eventProducer.produceSubscriptionRepositoryRelease(release);
      }
    }
  }
}
