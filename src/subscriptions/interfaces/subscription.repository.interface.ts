import { Subscription } from '../types/subscription';
import { SubscribeBody } from '../schemas/subscription.schema';
import { SubscriptionUpdateInput } from '../types/subscription-repository';

export type SubscribeReq = SubscribeBody & { lastSeenTag: string | null };

export interface SubscriptionRepositoryInterface {
  getConfirmedSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByEmail(email: string): Promise<Subscription[]>;
  getSubscriptionByToken(token: string): Promise<Subscription | null>;
  create(subscribeReq: SubscribeReq, token: string): Promise<Subscription>;
  updateByToken(token: string, update: SubscriptionUpdateInput): Promise<Subscription | null>;
  deleteByToken(token: string): Promise<Subscription | null>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;
}
