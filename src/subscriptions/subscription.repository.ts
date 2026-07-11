import { ConflictError } from '../common/utils/errors/custom-errors';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { Subscription } from './types/subscription';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { PRISMA_ERROR_CODES } from '../common/constants/prisma-error-codes';
import {
  SubscribeReq,
  SubscriptionRepositoryInterface,
} from './interfaces/subscription.repository.interface';
import { SubscriptionUpdateInput } from './types/subscription-repository';
import { SubscriptionPrismaMapper } from './mappers/subscription-prisma.mapper';

export class SubscriptionRepository implements SubscriptionRepositoryInterface {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mapper: SubscriptionPrismaMapper,
  ) {}

  async getConfirmedSubscriptions(): Promise<Subscription[]> {
    return this.mapper.toSubscriptions(
      await this.prisma.subscription.findMany({ where: { confirmed: true } }),
    );
  }

  async getSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    return this.mapper.toSubscriptions(
      await this.prisma.subscription.findMany({ where: { email } }),
    );
  }

  async getSubscriptionByToken(token: string): Promise<Subscription | null> {
    return this.mapper.toSubscription(
      await this.prisma.subscription.findUnique({ where: { token } }),
    );
  }

  async create(subscribeReq: SubscribeReq, token: string): Promise<Subscription> {
    try {
      return this.mapper.toSubscription(
        await this.prisma.subscription.create({
          data: { ...subscribeReq, token },
        }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
          throw new ConflictError(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_EMAIL_REPO);
        }
      }
      throw err;
    }
  }

  async updateByToken(
    token: string,
    update: SubscriptionUpdateInput,
  ): Promise<Subscription | null> {
    try {
      return this.mapper.toSubscription(
        await this.prisma.subscription.update({ data: update, where: { token } }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
          return null;
        }

        if (err.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
          throw new ConflictError(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_EMAIL_REPO);
        }
      }
      throw err;
    }
  }

  async deleteByToken(token: string): Promise<Subscription | null> {
    try {
      return this.mapper.toSubscription(
        await this.prisma.subscription.delete({ where: { token } }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return null;
      }
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
