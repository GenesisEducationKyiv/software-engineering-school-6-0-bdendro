import { RepositoryReleaseDetectedEvent } from '../schemas/repository-release.schema';

export interface SubscriptionEventProducerInterface {
  produceSubscriptionCreated(email: string, confirmationUrl: string, repo: string): Promise<void>;
  produceSubscriptionConfirmed(email: string, unsubscribeUrl: string, repo: string): Promise<void>;
  produceSubscriptionUnsubscribed(email: string, repo: string): Promise<void>;
}

export interface SubscriptionRepositoryReleaseEventProducerInterface {
  produceSubscriptionRepositoryRelease(
    email: string,
    release: RepositoryReleaseDetectedEvent,
    unsubscribeUrl: string,
  ): Promise<void>;
}
