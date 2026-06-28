import { randomUUID } from 'node:crypto';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { SubscribeBody } from './schemas/subscription.schema';
import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { Subscription, SubscriptionWithRepository } from './types/subscription';
import { buildConfirmationUrl, buildUnsubscribeUrl } from './utils/build-url';
import {
  SubscriptionEventProducerInterface,
  SubscriptionRepositoryReleaseEventProducerInterface,
} from './interfaces/subscription-event.producer';
import { RepositoryServiceInterface } from '../../../apps/tracker/src/modules/repository';
import { RepositoryReleaseDetectedEvent } from './schemas/repository-release.schema';

type SubscriptionEventProducer = SubscriptionEventProducerInterface &
  SubscriptionRepositoryReleaseEventProducerInterface;

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryInterface,
    private readonly eventProducer: SubscriptionEventProducer,
    private readonly repositoryService: RepositoryServiceInterface,
    private readonly subscriptionBaseUrl: string,
  ) {}

  async getConfirmedSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionRepository.getConfirmedSubscriptions();
  }

  async getSubscriptionsWithRepoByEmail(email: string): Promise<SubscriptionWithRepository[]> {
    return this.subscriptionRepository.getSubscriptionsWithRepoByEmail(email);
  }

  async getSubscriptionsByRepo(repo: string): Promise<Subscription[]> {
    return this.subscriptionRepository.getSubscriptionsByRepo(repo);
  }

  async subscribe(subscribeBody: SubscribeBody): Promise<void> {
    const repository = await this.repositoryService.track(subscribeBody.repo);

    const token = randomUUID();
    await this.subscriptionRepository.create({
      email: subscribeBody.email,
      token,
      repositoryId: repository.id,
    });

    const confirmationUrl = buildConfirmationUrl(this.subscriptionBaseUrl, token);
    await this.eventProducer.produceSubscriptionCreated(
      subscribeBody.email,
      confirmationUrl,
      repository.repo,
    );
  }

  async confirm(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.getSubscriptionByToken(token);

    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);
    if (subscription.confirmed) return;

    const confirmedSubscription = await this.subscriptionRepository.confirmByToken(token);

    const unsubscribeUrl = buildUnsubscribeUrl(this.subscriptionBaseUrl, token);
    await this.eventProducer.produceSubscriptionConfirmed(
      confirmedSubscription.email,
      unsubscribeUrl,
      confirmedSubscription.repository.repo,
    );
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.deleteByToken(token);

    await this.eventProducer.produceSubscriptionUnsubscribed(
      subscription.email,
      subscription.repository.repo,
    );
  }

  async deleteUnconfirmed(expirationTimeInMs: number): Promise<number> {
    return this.subscriptionRepository.deleteUnconfirmed(expirationTimeInMs);
  }

  async processRepositoryRelease(release: RepositoryReleaseDetectedEvent): Promise<void> {
    const subscriptions = await this.getSubscriptionsByRepo(release.repoName);
    const eventPromises: Promise<void>[] = [];
    for (const sub of subscriptions) {
      eventPromises.push(
        this.eventProducer.produceSubscriptionRepositoryRelease(
          sub.email,
          release,
          buildUnsubscribeUrl(this.subscriptionBaseUrl, sub.token),
        ),
      );
    }
    // Will be modified with adding outbox
    await Promise.all(eventPromises);
  }
}
