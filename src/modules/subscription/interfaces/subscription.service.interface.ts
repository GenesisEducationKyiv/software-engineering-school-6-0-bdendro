import { RepositoryReleaseDetectedEvent } from '../schemas/repository-release.schema';
import { SubscribeBody } from '../schemas/subscription.schema';
import { Subscription, SubscriptionWithRepository } from '../types/subscription';

export interface SubscriptionServiceInterface {
  getConfirmedSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsWithRepoByEmail(email: string): Promise<SubscriptionWithRepository[]>;
  getSubscriptionsByRepo(repo: string): Promise<Subscription[]>;
  subscribe(subscribeBody: SubscribeBody): Promise<void>;
  confirm(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;

  processRepositoryRelease(release: RepositoryReleaseDetectedEvent): Promise<void>;
}
