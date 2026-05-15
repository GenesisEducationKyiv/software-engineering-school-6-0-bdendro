import { Prisma, Subscription } from '../../generated/prisma/client';
import { SubscribeBody } from '../schemas/subscription.schema';

export type SubscribeReq = SubscribeBody & { lastSeenTag: string | null };

export interface SubscriptionRepositoryInterface {
  getAll(): Promise<Subscription[]>;
  getSubscriptionsByEmail(email: string): Promise<Subscription[]>;
  getSubscriptionByToken(token: string): Promise<Subscription | null>;
  create(subscribeReq: SubscribeReq, token: string): Promise<Subscription>;
  updateByToken(
    token: string,
    update: Prisma.SubscriptionUpdateInput,
  ): Promise<Subscription | null>;
  deleteByToken(token: string): Promise<Subscription | null>;
  deleteUnconfirmed(expirationTimeInMs: number): Promise<number>;
}
