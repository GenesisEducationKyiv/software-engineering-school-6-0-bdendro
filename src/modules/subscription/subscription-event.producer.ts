import {
  SubscriptionConfirmedEvent,
  SubscriptionCreatedEvent,
  SubscriptionRepositoryReleasedEvent,
  SubscriptionUnsubscribedEvent,
} from '../../../libs/contracts/main/events/main.produce.contract';
import { SUBSCRIPTION_EVENT_ROUTING_KEYS } from '../../../libs/contracts/main/events/routing-keys';
import type { MessageProducerInterface } from '../../../libs/infrastructure/message-broker/interfaces/message.producer.interface';
import { GithubRelease } from '../github';
import {
  RepositoryReleaseEventProducerInterface,
  SubscriptionEventProducerInterface,
} from './interfaces/subscription-event.producer';
import { SubscriptionProducerMapper } from './mappers/subscription-producer.mapper';

export class SubscriptionEventProducer
  implements SubscriptionEventProducerInterface, RepositoryReleaseEventProducerInterface
{
  constructor(
    private readonly messageProducer: MessageProducerInterface,
    private readonly mapper: SubscriptionProducerMapper,
  ) {}

  async produceSubscriptionCreated(
    email: string,
    confirmationUrl: string,
    repo: string,
  ): Promise<void> {
    const payload: SubscriptionCreatedEvent = { email, confirmationUrl, repo };
    await this.messageProducer.produce(SUBSCRIPTION_EVENT_ROUTING_KEYS.SUBSCRIBED, payload);
  }

  async produceSubscriptionConfirmed(
    email: string,
    unsubscribeUrl: string,
    repo: string,
  ): Promise<void> {
    const payload: SubscriptionConfirmedEvent = { email, unsubscribeUrl, repo };
    await this.messageProducer.produce(SUBSCRIPTION_EVENT_ROUTING_KEYS.CONFIRMED, payload);
  }

  async produceSubscriptionUnsubscribed(email: string, repo: string): Promise<void> {
    const payload: SubscriptionUnsubscribedEvent = { email, repo };
    await this.messageProducer.produce(SUBSCRIPTION_EVENT_ROUTING_KEYS.UNSUBSCRIBED, payload);
  }

  async produceSubscriptionRepositoryRelease(
    email: string,
    release: GithubRelease,
    unsubscribeUrl: string,
  ): Promise<void> {
    const payload: SubscriptionRepositoryReleasedEvent = {
      email,
      unsubscribeUrl,
      release: this.mapper.toRepositoryRelease(release),
    };
    await this.messageProducer.produce(
      SUBSCRIPTION_EVENT_ROUTING_KEYS.REPOSITORY_RELEASED,
      payload,
    );
  }
}
