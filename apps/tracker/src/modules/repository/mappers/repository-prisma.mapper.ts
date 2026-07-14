import { Repository as PrismaRepository } from '../../../../../../libs/database/generated/prisma/client';
import { Repository } from '../types/repository';
import { RepositoryCreateInput } from '../types/repository-repository';

type RepositoryPrismaCreateInput = Omit<PrismaRepository, 'id' | 'createdAt'>;

export class RepositoryPrismaMapper {
  toRepository(prismaRepository: PrismaRepository): Repository;
  toRepository(prismaRepository: PrismaRepository | null): Repository | null;
  toRepository(prismaRepository: PrismaRepository | null): Repository | null {
    if (!prismaRepository) return null;

    return {
      id: prismaRepository.id,
      repo: prismaRepository.repoName,
      lastSeenTag: prismaRepository.lastSeenTag,
      createdAt: prismaRepository.createdAt,
    };
  }

  toRepositories(prismaRepository: PrismaRepository[]): Repository[] {
    return prismaRepository.map((pRepo) => this.toRepository(pRepo));
  }

  toRepositoryCreateInput(repositoryInput: RepositoryCreateInput): RepositoryPrismaCreateInput {
    return {
      repoName: repositoryInput.repo,
      lastSeenTag: repositoryInput.lastSeenTag,
    };
  }
}
