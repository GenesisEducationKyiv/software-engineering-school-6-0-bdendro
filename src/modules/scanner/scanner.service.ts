import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { GithubServiceInterface } from '../github';
import { RepositoryServiceInterface } from '../repository';
import { SubscriptionServiceInterface } from '../subscription';
import { RepositoryReleaseEventProducerInterface } from '../subscription/interfaces/subscription-event.producer';
import { buildUnsubscribeUrl } from '../subscription/utils/build-url'; // todo: remove
import { ScannerServiceInterface } from './interfaces/scanner.service.interface';

export class ScannerService implements ScannerServiceInterface {
  constructor(
    private readonly subscriptionService: SubscriptionServiceInterface, // todo: remove
    private readonly repositoryService: RepositoryServiceInterface,
    private readonly githubService: GithubServiceInterface,
    private readonly eventProducer: RepositoryReleaseEventProducerInterface,
    private readonly logger: AppLogger,
    private readonly baseUrl: string, // todo: remove
  ) {}

  async detectReleases(): Promise<void> {
    const repositories = await this.repositoryService.getAll();

    for (const repo of repositories) {
      const release = await this.githubService.getLastRelease(repo.repo);
      if (release !== null && release.tagName !== repo.lastSeenTag) {
        const subscriptions = await this.subscriptionService.getSubscriptionsByRepo(repo.id);

        try {
          await this.repositoryService.updateTag(repo.id, release.tagName);
        } catch (err) {
          if (err instanceof NotFoundError)
            this.logger.info({ err }, 'Error while trying to update repository lastSeenTag');

          throw err;
        }

        for (const sub of subscriptions) {
          const unsubscribeUrl = buildUnsubscribeUrl(this.baseUrl, sub.token);
          await this.eventProducer.produceSubscriptionRepositoryRelease(
            sub.email,
            release,
            unsubscribeUrl,
          );
        }
      }
    }
  }
}
