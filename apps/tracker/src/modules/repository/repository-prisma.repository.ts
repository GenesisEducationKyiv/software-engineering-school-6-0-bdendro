import {
  ConflictError,
  NotFoundError,
} from '../../../../../libs/common/utils/errors/custom-errors';
import { PRISMA_ERROR_CODES } from '../../../../../libs/infrastructure/database/prisma/constants/prisma.const';
import { Prisma, PrismaClient } from '../../../../../libs/database/generated/prisma/client';
import { REPOSITORY_ERROR_MESSAGES } from './constants/error-messages';
import { RepositoryRepositoryInterface } from './interfaces/repository.repository.interface';
import { RepositoryPrismaMapper } from './mappers/repository-prisma.mapper';
import { Repository } from './types/repository';
import { RepositoryCreateInput } from './types/repository-repository';

export class RepositoryPrismaRepository implements RepositoryRepositoryInterface {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mapper: RepositoryPrismaMapper,
  ) {}

  async getById(id: number): Promise<Repository | null> {
    return this.mapper.toRepository(await this.prisma.repository.findUnique({ where: { id } }));
  }

  async getByRepoName(repoName: string): Promise<Repository | null> {
    return this.mapper.toRepository(
      await this.prisma.repository.findUnique({ where: { repoName } }),
    );
  }

  async getAll(): Promise<Repository[]> {
    return this.mapper.toRepositories(await this.prisma.repository.findMany());
  }

  async create(repositoryInput: RepositoryCreateInput): Promise<Repository> {
    const data = this.mapper.toRepositoryCreateInput(repositoryInput);
    try {
      return this.mapper.toRepository(await this.prisma.repository.create({ data }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT)
          throw new ConflictError(REPOSITORY_ERROR_MESSAGES.UNIQUE_REPO_NAME);

        throw err;
      }
      throw err;
    }
  }

  async createOrGet(repositoryInput: RepositoryCreateInput): Promise<Repository> {
    const data = this.mapper.toRepositoryCreateInput(repositoryInput);
    return this.mapper.toRepository(
      await this.prisma.repository.upsert({
        where: { repoName: data.repoName },
        update: {},
        create: data,
      }),
    );
  }

  async updateTag(id: number, lastSeenTag: string): Promise<Repository> {
    try {
      return this.mapper.toRepository(
        await this.prisma.repository.update({ where: { id }, data: { lastSeenTag } }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(REPOSITORY_ERROR_MESSAGES.NOT_FOUND);

        throw err;
      }
      throw err;
    }
  }

  async delete(id: number): Promise<Repository> {
    try {
      return this.mapper.toRepository(await this.prisma.repository.delete({ where: { id } }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(REPOSITORY_ERROR_MESSAGES.NOT_FOUND);

        throw err;
      }
      throw err;
    }
  }
}
