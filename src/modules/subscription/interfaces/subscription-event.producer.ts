import { GithubRelease } from '../../github';

export interface SubscriptionEventProducerInterface {
  produceSubscriptionCreated(email: string, confirmationUrl: string, repo: string): Promise<void>;
  produceSubscriptionConfirmed(email: string, unsubscribeUrl: string, repo: string): Promise<void>;
  produceSubscriptionUnsubscribed(email: string, repo: string): Promise<void>;
}

export interface RepositoryReleaseEventProducerInterface {
  produceSubscriptionRepositoryRelease(
    email: string,
    release: GithubRelease,
    unsubscribeUrl: string,
  ): Promise<void>;
}
