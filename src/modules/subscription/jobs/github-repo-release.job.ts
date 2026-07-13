import { AppLogger } from '../../../../libs/infrastructure/logger/interfaces/logger.interface';
import {
  ConflictError,
  GithubError,
  NotFoundError,
} from '../../../../libs/common/utils/errors/custom-errors';
import { GithubServiceInterface } from '../../github/interfaces/github.service.interface';
import { GithubRateLimiterInterface } from '../../github/utils/github-rate-limiter';
import { SubscriptionServiceInterface } from '../interfaces/subscription.service.interface';
import { JobInterface } from '../../../jobs/interfaces/job.interface';
import { buildUnsubscribeUrl } from '../utils/build-url';
import { RepositoryReleaseNotificationSenderInterface } from '../../../infrastructure/notification/interfaces/repository-release-email.sender.interface';

export class GithubReleaseNotificationJob implements JobInterface {
  constructor(
    private readonly githubService: GithubServiceInterface,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly notificationSender: RepositoryReleaseNotificationSenderInterface,
    private readonly githubRateLimiter: GithubRateLimiterInterface,
    private readonly logger: AppLogger,
    private readonly baseUrl: string,
  ) {}
  async run(): Promise<void> {
    this.logger.info('GitHub repository release notification execution.');
    try {
      if (this.githubRateLimiter.isBlocked()) {
        throw new GithubError(
          new Error(
            `GitHub API is rate-limited [${this.githubRateLimiter.getRetryAfterSeconds()} seconds].`,
          ),
        );
      }
      await this.checkReleasesAndNotifySubscribers();
    } catch (err) {
      this.logger.error({ err }, 'While doing scheduled repository release notification task');
    }
  }

  private async checkReleasesAndNotifySubscribers(): Promise<void> {
    const subscriptions = await this.subscriptionService.getConfirmedSubscriptions();
    for (const sub of subscriptions) {
      if (this.githubRateLimiter.isBlocked()) {
        throw new GithubError(
          new Error(
            `GitHub API is rate-limited [${this.githubRateLimiter.getRetryAfterSeconds()} seconds].`,
          ),
        );
      }
      try {
        const release = await this.githubService.getLastRelease(sub.repo);
        if (release !== null && release.tagName !== sub.lastSeenTag) {
          const unsubscribeUrl = buildUnsubscribeUrl(this.baseUrl, sub.token);
          await this.notificationSender.sendRepositoryReleaseNotification(
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
      } catch (err) {
        this.logger.error({ err }, 'While doing scheduled repository release notification task');
      }
    }
  }
}
