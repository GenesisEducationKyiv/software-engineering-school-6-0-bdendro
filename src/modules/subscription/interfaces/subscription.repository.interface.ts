import { Subscription, SubscriptionWithRepository } from '../types/subscription';
import { SubscriptionCreateInput, SubscriptionUpdateInput } from '../types/subscription-repository';

export interface SubscriptionRepositoryInterface {
  getSubscriptionByToken(token: string): Promise<Subscription | null>;
  getConfirmedSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsWithRepoByEmail(email: string): Promise<SubscriptionWithRepository[]>;
  getSubscriptionsByRepo(repositoryId: number): Promise<Subscription[]>;
  create(subscriptionInput: SubscriptionCreateInput): Promise<Subscription>;
  updateByToken(token: string, update: SubscriptionUpdateInput): Promise<Subscription>;
  confirmByToken(token: string): Promise<SubscriptionWithRepository>;
  deleteByToken(token: string): Promise<SubscriptionWithRepository>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;
}
