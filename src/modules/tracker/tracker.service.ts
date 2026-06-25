import { ConflictError, NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import { GithubServiceInterface } from '../github';
import { SubscriptionServiceInterface } from '../subscription';
import { RepositoryReleaseEventProducerInterface } from '../subscription/interfaces/subscription-event.producer';
import { buildUnsubscribeUrl } from '../subscription/utils/build-url'; // todo: remove
import { TrackerServiceInterface } from './interfaces/tracker.service.interface';

export class TrackerService implements TrackerServiceInterface {
  constructor(
    private readonly subscriptionService: SubscriptionServiceInterface, // todo: remove
    private readonly githubService: GithubServiceInterface,
    private readonly eventProducer: RepositoryReleaseEventProducerInterface,
    private readonly logger: AppLogger,
    private readonly baseUrl: string, // todo: remove
  ) {}

  async detectReleases(): Promise<void> {
    const subscriptions = await this.subscriptionService.getConfirmedSubscriptions();
    for (const sub of subscriptions) {
      const release = await this.githubService.getLastRelease(sub.repo);
      if (release !== null && release.tagName !== sub.lastSeenTag) {
        const unsubscribeUrl = buildUnsubscribeUrl(this.baseUrl, sub.token);
        await this.eventProducer.produceSubscriptionRepositoryRelease(
          sub.email,
          release,
          unsubscribeUrl,
        );
        try {
          await this.subscriptionService.updateLastSeenTagByToken(sub.token, release.tagName);
        } catch (err) {
          if (err instanceof ConflictError || err instanceof NotFoundError)
            this.logger.info({ err }, 'Error while trying to update last_seen_tag');
          throw err;
        }
      }
    }
  }
}
