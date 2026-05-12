import { SubscribeBody } from '../schemas/subscription.schema';
import { Subscription } from '../types/subscription';

export interface SubscriptionServiceInterface {
  getConfirmedSubscriptions(): Promise<Subscription[]>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;
  updateLastSeenTagByToken(token: string, lastSeenTag: string): Promise<Subscription>;
  subscribe(subscribeBody: SubscribeBody): Promise<void>;
  confirm(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
  getSubscriptionsByEmail(email: string): Promise<Subscription[]>;
}
