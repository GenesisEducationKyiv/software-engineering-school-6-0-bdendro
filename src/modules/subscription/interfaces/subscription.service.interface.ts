import { SubscribeStatuses } from '../constants/subscriptions.const';
import { RepositoryReleaseDetectedEvent } from '../schemas/repository-release.schema';
import { SubscribeBody } from '../schemas/subscription.schema';
import { Subscription, SubscriptionWithRepository } from '../types/subscription';

export type SubscribeResult =
  | { status: SubscribeStatuses['SUCCESS'] }
  | { status: SubscribeStatuses['PENDING']; operationId: number };

export interface SubscriptionServiceInterface {
  getConfirmedSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsWithRepoByEmail(email: string): Promise<SubscriptionWithRepository[]>;
  getSubscriptionsByRepo(repo: string): Promise<Subscription[]>;
  createSubscription(email: string, repoId: number, repoName: string): Promise<Subscription>;
  subscribe(subscribeBody: SubscribeBody): Promise<SubscribeResult>;
  confirm(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;

  processRepositoryRelease(release: RepositoryReleaseDetectedEvent): Promise<void>;
}
