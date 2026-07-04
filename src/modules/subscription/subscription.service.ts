import { randomUUID } from 'node:crypto';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import {
  SubscribeResult,
  SubscriptionServiceInterface,
} from './interfaces/subscription.service.interface';
import { SubscribeBody } from './schemas/subscription.schema';
import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import {
  Subscription,
  SubscriptionOperation,
  SubscriptionWithRepository,
} from './types/subscription';
import { buildConfirmationUrl, buildUnsubscribeUrl } from './utils/build-url';
import {
  SubscriptionEventProducerInterface,
  SubscriptionRepositoryReleaseEventProducerInterface,
} from './interfaces/subscription-event.producer';
import { RepositoryReleaseDetectedEvent } from './schemas/repository-release.schema';
import { RepositoryRepositoryReadableInterface } from '../repository';
import { SUBSCRIPTION_OPERATION_STATUSES } from './constants/subscriptions.const';
import { SubscribeSagaRepository } from './saga/interfaces/subscribe-saga.repository.interface';
import { SubscribeSagaCommandProducer } from './saga/subscribe-saga-command.producer';
import {
  SUBSCRIBE_SAGA_ERROR_REASON,
  SUBSCRIBE_SAGA_STATES,
} from './saga/constants/subscribe-saga.const';

type SubscriptionEventProducer = SubscriptionEventProducerInterface &
  SubscriptionRepositoryReleaseEventProducerInterface;

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryInterface,
    private readonly subscriptionRepositoryRepository: RepositoryRepositoryReadableInterface,
    private readonly eventProducer: SubscriptionEventProducer,
    private readonly subscribeSagaRepository: SubscribeSagaRepository,
    private readonly subscribeSagaCommandProducer: SubscribeSagaCommandProducer,
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

  async createSubscription(email: string, repoId: number, repoName: string): Promise<Subscription> {
    const token = randomUUID();

    const subscription = await this.subscriptionRepository.create({
      email,
      repositoryId: repoId,
      token,
    });

    const confirmationUrl = buildConfirmationUrl(this.subscriptionBaseUrl, subscription.token);
    await this.eventProducer.produceSubscriptionCreated(
      subscription.email,
      confirmationUrl,
      repoName,
    );

    return subscription;
  }

  async subscribe(subscribeBody: SubscribeBody): Promise<SubscribeResult> {
    const repository = await this.subscriptionRepositoryRepository.getByRepoName(
      subscribeBody.repo,
    );
    if (repository) {
      await this.createSubscription(subscribeBody.email, repository.id, repository.repo);
      return { status: SUBSCRIPTION_OPERATION_STATUSES.SUCCESS };
    }

    const saga = await this.subscribeSagaRepository.create({
      email: subscribeBody.email,
      repoName: subscribeBody.repo,
    });

    await this.subscribeSagaCommandProducer.produceTrackRepo(subscribeBody.repo, {
      correlationId: saga.id,
    });
    return { status: SUBSCRIPTION_OPERATION_STATUSES.PENDING, operationId: saga.id };
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

  async getSubscriptionOperation(id: number): Promise<SubscriptionOperation | null> {
    const saga = await this.subscribeSagaRepository.getById(id);
    if (!saga) return null;

    switch (saga.state) {
      case SUBSCRIBE_SAGA_STATES.STARTED:
      case SUBSCRIBE_SAGA_STATES.REPOSITORY_TRACKED:
        return {
          status: SUBSCRIPTION_OPERATION_STATUSES.PENDING,
          startedAt: saga.createdAt,
        };

      case SUBSCRIBE_SAGA_STATES.FAILED:
      case SUBSCRIBE_SAGA_STATES.COMPENSATED:
        return {
          errorReason: saga.errorReason ?? SUBSCRIBE_SAGA_ERROR_REASON.UNKNOWN,
          errorMessage: saga.errorMessage,
          status: SUBSCRIPTION_OPERATION_STATUSES.FAILED,
          startedAt: saga.createdAt,
        };
      default:
        return {
          status: SUBSCRIPTION_OPERATION_STATUSES.SUCCESS,
          startedAt: saga.createdAt,
        };
    }
  }
}
