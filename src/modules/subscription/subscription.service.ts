import { randomUUID } from 'node:crypto';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { SubscribeBody } from './schemas/subscription.schema';
import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { GithubServiceInterface, GITHUB_ERROR_MESSAGES } from '../github/index';
import { Subscription } from './types/subscription';
import { buildConfirmationUrl, buildUnsubscribeUrl } from './utils/build-url';
import { SubscriptionEventProducerInterface } from './interfaces/subscription-event.producer';

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryInterface,
    private readonly eventProducer: SubscriptionEventProducerInterface,
    private readonly githubService: GithubServiceInterface,
    private readonly subscriptionBaseUrl: string,
  ) {}

  async getConfirmedSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionRepository.getConfirmedSubscriptions();
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

    const confirmationUrl = buildConfirmationUrl(this.subscriptionBaseUrl, token);
    await this.eventProducer.produceSubscriptionCreated(
      subscribeBody.email,
      confirmationUrl,
      subscribeBody.repo,
    );
  }

  async confirm(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.getSubscriptionByToken(token);

    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);
    if (subscription.confirmed) return;

    await this.subscriptionRepository.updateByToken(token, {
      confirmed: true,
    });

    const unsubscribeUrl = buildUnsubscribeUrl(this.subscriptionBaseUrl, token);
    await this.eventProducer.produceSubscriptionConfirmed(
      subscription.email,
      unsubscribeUrl,
      subscription.repo,
    );
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.deleteByToken(token);
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    await this.eventProducer.produceSubscriptionUnsubscribed(subscription.email, subscription.repo);
  }

  async getSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    return await this.subscriptionRepository.getSubscriptionsByEmail(email);
  }
}
