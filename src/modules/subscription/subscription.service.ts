import { randomUUID } from 'node:crypto';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { SubscribeBody } from './schemas/subscription.schema';
import { NotFoundError } from '../../common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { GithubServiceInterface } from '../github/index';
import { GITHUB_ERROR_MESSAGES } from '../github/index';
import { Subscription } from './types/subscription';
import { SubscriptionEmailServiceInterface } from '../notification/interfaces/subscription-email.service.interface';

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryInterface,
    private readonly emailService: SubscriptionEmailServiceInterface,
    private readonly githubService: GithubServiceInterface,
  ) {}

  async getConfirmedSubscriptions(): Promise<Subscription[]> {
    return await this.subscriptionRepository.getConfirmedSubscriptions();
  }

  async deleteUnconfirmed(expirationTimeInMs: number): Promise<number> {
    return this.subscriptionRepository.deleteUnconfirmed(expirationTimeInMs);
  }

  async updateLastSeenTagByToken(token: string, lastSeenTag: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.updateByToken(token, { lastSeenTag });
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    return subscription;
  }

  async subscribe(subscribeBody: SubscribeBody): Promise<void> {
    const isRepoExists = await this.githubService.isRepositoryExists(subscribeBody.repo);
    if (!isRepoExists) throw new NotFoundError(GITHUB_ERROR_MESSAGES.REPO_NOT_FOUND);

    const release = await this.githubService.getLastRelease(subscribeBody.repo);

    const token = randomUUID();
    await this.subscriptionRepository.create(
      { ...subscribeBody, lastSeenTag: release?.tagName || null },
      token,
    );

    await this.emailService.sendConfirmationEmail(subscribeBody.email, token, subscribeBody.repo);
  }

  async confirm(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.getSubscriptionByToken(token);

    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);
    if (subscription.confirmed) return;

    await this.subscriptionRepository.updateByToken(token, {
      confirmed: true,
    });

    await this.emailService.sendConfirmationSuccessEmail(
      subscription.email,
      token,
      subscription.repo,
    );

    return;
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.deleteByToken(token);
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    await this.emailService.sendUnsubscribeSuccessEmail(subscription.email, subscription.repo);

    return;
  }

  async getSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    return await this.subscriptionRepository.getSubscriptionsByEmail(email);
  }
}
