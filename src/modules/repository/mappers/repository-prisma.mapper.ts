import { SubscriptionRepository as PrismaSubscriptionRepository } from '../../../../libs/database/generated/prisma/client';
import { SubscriptionRepositoryCreateWithoutSubscriptionsInput } from '../../../../libs/database/generated/prisma/models';
import { SubscriptionRepository } from '../types/repository';
import { SubscriptionRepositoryCreateInput } from '../types/repository-repository';

export class SubscriptionRepositoryPrismaMapper {
  constructor() {}

  toRepository(prismaRepository: PrismaSubscriptionRepository): SubscriptionRepository;
  toRepository(
    prismaRepository: PrismaSubscriptionRepository | null,
  ): SubscriptionRepository | null;
  toRepository(
    prismaRepository: PrismaSubscriptionRepository | null,
  ): SubscriptionRepository | null {
    if (!prismaRepository) return null;

    return {
      id: prismaRepository.id,
      repo: prismaRepository.repoName,
      lastSeenTag: prismaRepository.lastSeenTag,
      createdAt: prismaRepository.createdAt,
    };
  }

  toRepositories(prismaRepository: PrismaSubscriptionRepository[]): SubscriptionRepository[] {
    return prismaRepository.map((pRepo) => this.toRepository(pRepo));
  }

  toRepositoryCreateInput(
    repositoryInput: SubscriptionRepositoryCreateInput,
  ): SubscriptionRepositoryCreateWithoutSubscriptionsInput {
    return {
      id: repositoryInput.id,
      repoName: repositoryInput.repo,
      lastSeenTag: repositoryInput.lastSeenTag,
      createdAt: repositoryInput.createdAt,
    };
  }
}
