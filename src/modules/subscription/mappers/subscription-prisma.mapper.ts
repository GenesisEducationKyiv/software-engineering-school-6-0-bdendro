import type {
  Subscription as PrismaSubscription,
  Prisma,
} from '../../../../libs/database/generated/prisma/client';

import { Subscription, SubscriptionWithRepository } from '../types/subscription';

type PrismaSubscriptionWithRepository = Prisma.SubscriptionGetPayload<{
  include: { repository: true };
}>;

export class SubscriptionPrismaMapper {
  toSubscription(prismaSubscription: PrismaSubscription): Subscription;
  toSubscription(prismaSubscription: PrismaSubscription | null): Subscription | null;
  toSubscription(prismaSubscription: PrismaSubscription | null): Subscription | null {
    if (!prismaSubscription) return null;

    return {
      id: prismaSubscription.id,
      repositoryId: prismaSubscription.repositoryId,
      email: prismaSubscription.email,
      token: prismaSubscription.token,
      confirmed: prismaSubscription.confirmed,
      createdAt: prismaSubscription.createdAt,
    };
  }

  toSubscriptions(prismaSubscription: PrismaSubscription[]): Subscription[] {
    return prismaSubscription.map((pSub) => this.toSubscription(pSub));
  }

  toSubscriptionWithRepository(
    prismaSubscriptionWithRepository: PrismaSubscriptionWithRepository,
  ): SubscriptionWithRepository {
    const { repository: prismaRepository, ...prismaSubscription } =
      prismaSubscriptionWithRepository;

    const subscription = this.toSubscription(prismaSubscription);
    return {
      ...subscription,
      repository: {
        id: prismaRepository.id,
        repo: prismaRepository.repoName,
        lastSeenTag: prismaRepository.lastSeenTag,
        createdAt: prismaRepository.createdAt,
      },
    };
  }

  toSubscriptionsWithRepository(
    prismaSubscriptionsWithRepository: PrismaSubscriptionWithRepository[],
  ): SubscriptionWithRepository[] {
    return prismaSubscriptionsWithRepository.map((pSubRepo) =>
      this.toSubscriptionWithRepository(pSubRepo),
    );
  }
}
