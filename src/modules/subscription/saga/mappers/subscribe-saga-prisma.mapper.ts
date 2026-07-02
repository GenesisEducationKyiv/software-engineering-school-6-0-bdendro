import type { SubscribeSaga as PrismaSubscribeSaga } from '../../../../../libs/database/generated/prisma/client';
import { SubscribeSaga } from '../types/subscribe-saga';

export class SubscribeSagaPrismaMapper {
  toSubscribeSaga(prismaSubscribeSaga: PrismaSubscribeSaga): SubscribeSaga;
  toSubscribeSaga(prismaSubscribeSaga: PrismaSubscribeSaga | null): SubscribeSaga | null;
  toSubscribeSaga(prismaSubscribeSaga: PrismaSubscribeSaga | null): SubscribeSaga | null {
    if (!prismaSubscribeSaga) return null;

    return {
      id: prismaSubscribeSaga.id,
      email: prismaSubscribeSaga.email,
      repoName: prismaSubscribeSaga.repoName,
      repoId: prismaSubscribeSaga.repoId,
      subscriptionId: prismaSubscribeSaga.subscriptionId,
      state: prismaSubscribeSaga.state,
      errorMessage: prismaSubscribeSaga.errorMessage,
      createdAt: prismaSubscribeSaga.createdAt,
      updatedAt: prismaSubscribeSaga.updatedAt,
    };
  }
}
