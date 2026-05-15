import { ConflictError, GithubError, NotFoundError } from '../common/utils/errors/custom-errors';
import { AppLogger } from '../config/logger';
import { EmailServiceInterface } from '../email/interfaces/email.service.interface';
import { GithubServiceInterface } from '../github/interfaces/github.service.interface';
import { GithubRateLimiterInterface } from '../github/utils/github-rate-limiter';
import { SubscriptionServiceInterface } from '../subscriptions/interfaces/subscription.service.interface';

export interface GithubRepositoryReleaseJobInterface {
  run(): Promise<void>;
}

export class GithubRepositoryReleaseJob implements GithubRepositoryReleaseJobInterface {
  constructor(
    private readonly githubService: GithubServiceInterface,
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly emailService: EmailServiceInterface,
    private readonly githubRateLimiter: GithubRateLimiterInterface,
    private readonly logger: AppLogger,
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
    const subscriptions = await this.subscriptionService.getAll();
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
        if (release !== null && release.lastSeenTag !== sub.lastSeenTag) {
          await this.emailService.sendGitHubReleaseEmail(sub.email, release, sub.token);
          try {
            await this.subscriptionService.updateLastSeenTagByToken(sub.token, release.lastSeenTag);
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
