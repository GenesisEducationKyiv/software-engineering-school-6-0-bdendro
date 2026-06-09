import { Subscription as PrismaSubscription } from '../../../generated/prisma/client';
import { SubscriptionResponse } from '../dto/subscription.response.dto';
import { Subscription } from '../types/subscription';

export interface SubscriptionPrismaMapperInterface {
  toSubscription(prismaSubscription: PrismaSubscription): Subscription;
  toSubscription(prismaSubscription: PrismaSubscription | null): Subscription | null;

  toSubscriptions(prismaSubscription: PrismaSubscription[]): Subscription[];
}

export interface SubscriptionControllerMapperInterface {
  toSubscriptionResponse(subscription: Subscription): SubscriptionResponse;

  toSubscriptionsResponse(subscriptions: Subscription[]): SubscriptionResponse[];
}
