import { ConflictError, NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { Prisma, PrismaClient } from '../../../libs/database/generated/prisma/client';
import { Subscription, SubscriptionWithRepository } from './types/subscription';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { PRISMA_ERROR_CODES } from '../../../libs/infrastructure/database/prisma/constants/prisma.const';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionCreateInput, SubscriptionUpdateInput } from './types/subscription-repository';
import { SubscriptionPrismaMapper } from './mappers/subscription-prisma.mapper';

export class SubscriptionRepository implements SubscriptionRepositoryInterface {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mapper: SubscriptionPrismaMapper,
  ) {}

  async getSubscriptionByToken(token: string): Promise<Subscription | null> {
    return this.mapper.toSubscription(
      await this.prisma.subscription.findUnique({
        where: { token },
      }),
    );
  }

  async getConfirmedSubscriptions(): Promise<Subscription[]> {
    return this.mapper.toSubscriptions(
      await this.prisma.subscription.findMany({ where: { confirmed: true } }),
    );
  }

  async getSubscriptionsWithRepoByEmail(email: string): Promise<SubscriptionWithRepository[]> {
    return this.mapper.toSubscriptionsWithRepository(
      await this.prisma.subscription.findMany({ where: { email }, include: { repository: true } }),
    );
  }

  async getSubscriptionsByRepo(repositoryId: number): Promise<Subscription[]> {
    return this.mapper.toSubscriptions(
      await this.prisma.subscription.findMany({ where: { repositoryId } }),
    );
  }

  async create(subscriptionInput: SubscriptionCreateInput): Promise<Subscription> {
    try {
      return this.mapper.toSubscription(
        await this.prisma.subscription.create({
          data: subscriptionInput,
        }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT)
          throw new ConflictError(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_EMAIL_REPOSITORY);

        throw err;
      }
      throw err;
    }
  }

  async updateByToken(token: string, update: SubscriptionUpdateInput): Promise<Subscription> {
    try {
      return this.mapper.toSubscription(
        await this.prisma.subscription.update({ data: update, where: { token } }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

        if (err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
          throw new ConflictError(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_EMAIL_REPOSITORY);
        }

        throw err;
      }
      throw err;
    }
  }

  async confirmByToken(token: string): Promise<SubscriptionWithRepository> {
    try {
      return this.mapper.toSubscriptionWithRepository(
        await this.prisma.subscription.update({
          where: { token },
          data: { confirmed: true },
          include: { repository: true },
        }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

        throw err;
      }
      throw err;
    }
  }

  async deleteByToken(token: string): Promise<SubscriptionWithRepository> {
    try {
      return this.mapper.toSubscriptionWithRepository(
        await this.prisma.subscription.delete({ where: { token }, include: { repository: true } }),
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
      )
        throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

      throw err;
    }
  }

  async deleteUnconfirmed(expirationTimeInMs: number): Promise<number> {
    const expirationDate = new Date(Date.now() - expirationTimeInMs);

    const result = await this.prisma.subscription.deleteMany({
      where: {
        confirmed: false,
        createdAt: {
          lte: expirationDate,
        },
      },
    });

    return result.count;
  }
}
