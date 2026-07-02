import { ConflictError, NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { Prisma } from '../../../libs/database/generated/prisma/client';
import { PRISMA_ERROR_CODES } from '../../../libs/infrastructure/database/prisma/constants/prisma.const';
import { PrismaDBClient } from '../../infrastructure/database/prisma';
import { REPOSITORY_ERROR_MESSAGES } from './constants/error-messages';
import {
  RepositoryRepositoryReadableInterface,
  RepositoryRepositoryWritableInterface,
} from './interfaces/repository.repository.interface';
import { SubscriptionRepositoryPrismaMapper } from './mappers/repository-prisma.mapper';
import { SubscriptionRepository } from './types/repository';
import { SubscriptionRepositoryCreateInput } from './types/repository-repository';

export class SubscriptionRepositoryPrismaRepository
  implements RepositoryRepositoryWritableInterface, RepositoryRepositoryReadableInterface
{
  constructor(
    private readonly prisma: PrismaDBClient,
    private readonly mapper: SubscriptionRepositoryPrismaMapper,
  ) {}

  async getByRepoName(repoName: string): Promise<SubscriptionRepository | null> {
    return this.mapper.toRepository(
      await this.prisma.subscriptionRepository.findUnique({ where: { repoName } }),
    );
  }

  async createOrGet(
    repositoryInput: SubscriptionRepositoryCreateInput,
  ): Promise<SubscriptionRepository> {
    const data = this.mapper.toRepositoryCreateInput(repositoryInput);

    return this.mapper.toRepository(
      await this.prisma.subscriptionRepository.upsert({
        where: { id: data.id },
        update: {},
        create: data,
      }),
    );
  }

  async updateOrCreate(
    repositoryInput: SubscriptionRepositoryCreateInput,
  ): Promise<SubscriptionRepository> {
    const data = this.mapper.toRepositoryCreateInput(repositoryInput);

    return this.mapper.toRepository(
      await this.prisma.subscriptionRepository.upsert({
        where: { id: data.id },
        update: data,
        create: data,
      }),
    );
  }

  async deleteById(id: number): Promise<SubscriptionRepository> {
    try {
      return this.mapper.toRepository(
        await this.prisma.subscriptionRepository.delete({ where: { id } }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(REPOSITORY_ERROR_MESSAGES.NOT_FOUND);

        if (err.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT)
          throw new ConflictError(REPOSITORY_ERROR_MESSAGES.IN_USE);

        throw err;
      }
      throw err;
    }
  }
}
