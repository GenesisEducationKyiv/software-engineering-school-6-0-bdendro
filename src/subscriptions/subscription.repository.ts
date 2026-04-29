import { ConflictError } from '../common/utils/errors/custom-errors';
import { Prisma, PrismaClient, Subscription } from '../generated/prisma/client';
import { SubscriptionUpdateInput } from '../generated/prisma/models';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { PRISMA_ERROR_CODES } from '../common/constants/prisma-error-codes';
import {
  SubscribeReq,
  SubscriptionRepositoryInterface,
} from './interfaces/subscription.repository.interface';

export class SubscriptionRepository implements SubscriptionRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(): Promise<Subscription[]> {
    return await this.prisma.subscription.findMany();
  }

  async getSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    return await this.prisma.subscription.findMany({ where: { email } });
  }

  async getSubscriptionByToken(token: string): Promise<Subscription | null> {
    return await this.prisma.subscription.findUnique({ where: { token } });
  }

  async create(subscribeReq: SubscribeReq, token: string): Promise<Subscription> {
    try {
      return await this.prisma.subscription.create({
        data: { ...subscribeReq, token },
      });
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
      if ('token' in update && typeof update.token === 'string') {
        const subscription = await this.prisma.subscription.findUnique({
          where: { token: update.token },
        });
        if (subscription) throw new ConflictError(SUBSCRIPTION_ERROR_MESSAGES.UNIQUE_TOKEN);
      }
      return await this.prisma.subscription.update({ data: update, where: { token } });
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
      return await this.prisma.subscription.delete({ where: { token } });
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
