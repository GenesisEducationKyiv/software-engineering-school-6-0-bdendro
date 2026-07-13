import { Subscription as PrismaSubscription } from '../../../generated/prisma/client';
import { Subscription } from '../types/subscription';

export class SubscriptionPrismaMapper {
  toSubscription(prismaSubscription: PrismaSubscription): Subscription;
  toSubscription(prismaSubscription: PrismaSubscription | null): Subscription | null;
  toSubscription(prismaSubscription: PrismaSubscription | null): Subscription | null {
    if (!prismaSubscription) return null;

    return {
      id: prismaSubscription.id,
      email: prismaSubscription.email,
      repo: prismaSubscription.repo,
      token: prismaSubscription.token,
      confirmed: prismaSubscription.confirmed,
      lastSeenTag: prismaSubscription.lastSeenTag,
      createdAt: prismaSubscription.createdAt,
    };
  }

  toSubscriptions(prismaSubscription: PrismaSubscription[]): Subscription[] {
    return prismaSubscription.map((pSub) => this.toSubscription(pSub));
  }
}
