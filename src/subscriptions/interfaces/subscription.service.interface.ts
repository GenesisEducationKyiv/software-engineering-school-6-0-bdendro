import { Subscription } from '../../generated/prisma/client';
import { SubscriptionResponseDTO } from '../dto/subscription.response.dto';
import { SubscribeBody } from '../schemas/subscription.schema';

export interface SubscriptionServiceInterface {
  getAll(): Promise<Subscription[]>;
  deleteUnconfirmed(expirationTime: string): Promise<number>;
  updateLastSeenTagByToken(token: string, lastSeenTag: string): Promise<SubscriptionResponseDTO>;
  subscribe(subscribeBody: SubscribeBody): Promise<void>;
  confirm(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
  getSubscriptionsByEmail(email: string): Promise<SubscriptionResponseDTO[]>;
}
