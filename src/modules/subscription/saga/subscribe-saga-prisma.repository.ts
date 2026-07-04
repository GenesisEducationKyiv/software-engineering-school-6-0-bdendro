import { NotFoundError } from '../../../../libs/common/utils/errors/custom-errors';
import { Prisma } from '../../../../libs/database/generated/prisma/client';
import { PRISMA_ERROR_CODES } from '../../../../libs/infrastructure/database/prisma/constants/prisma.const';
import { PrismaDBClient } from '../../../infrastructure/database/prisma';
import {
  SUBSCRIBE_SAGA_ERROR_MESSAGES,
  SUBSCRIBE_SAGA_STATES,
  SubscribeSagaErrorReason,
  SubscribeSagaState,
} from './constants/subscribe-saga.const';
import { SubscribeSagaRepository } from './interfaces/subscribe-saga.repository.interface';
import { SubscribeSagaPrismaMapper } from './mappers/subscribe-saga-prisma.mapper';
import { SubscribeSaga } from './types/subscribe-saga';
import { SubscribeSagaCreateInput } from './types/subscribe-saga-repository';

type SubscribeSagaUpdateInput = Partial<
  Omit<SubscribeSaga, 'id' | 'createdAt' | 'updatedAt' | 'state'>
> & {
  state?: SubscribeSagaState;
};

export class SubscribeSagaPrismaRepository implements SubscribeSagaRepository {
  constructor(
    private readonly prisma: PrismaDBClient,
    private readonly mapper: SubscribeSagaPrismaMapper,
  ) {}

  async getById(id: number): Promise<SubscribeSaga | null> {
    return this.mapper.toSubscribeSaga(
      await this.prisma.subscribeSaga.findUnique({ where: { id } }),
    );
  }

  async create(createSagaInput: SubscribeSagaCreateInput): Promise<SubscribeSaga> {
    return this.mapper.toSubscribeSaga(
      await this.prisma.subscribeSaga.create({ data: createSagaInput }),
    );
  }

  async markRepoTracked(id: number, repoId: number): Promise<SubscribeSaga> {
    return this.update(id, { state: SUBSCRIBE_SAGA_STATES.REPOSITORY_TRACKED, repoId });
  }

  async markCompleted(id: number, subscriptionId: number): Promise<SubscribeSaga> {
    return this.update(id, { state: SUBSCRIBE_SAGA_STATES.COMPLETED, subscriptionId });
  }

  async markFailed(
    id: number,
    errorReason: SubscribeSagaErrorReason,
    errorMessage: string,
  ): Promise<SubscribeSaga> {
    return this.update(id, { state: SUBSCRIBE_SAGA_STATES.FAILED, errorReason, errorMessage });
  }

  async markCompensated(id: number, removeRepoId: boolean): Promise<SubscribeSaga> {
    const state: SubscribeSagaState = SUBSCRIBE_SAGA_STATES.COMPENSATED;
    if (removeRepoId) {
      return this.update(id, { state, repoId: null });
    }
    return this.update(id, { state });
  }

  private async update(
    id: number,
    updateSagaInput: SubscribeSagaUpdateInput,
  ): Promise<SubscribeSaga> {
    try {
      return this.mapper.toSubscribeSaga(
        await this.prisma.subscribeSaga.update({ where: { id }, data: updateSagaInput }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND)
          throw new NotFoundError(SUBSCRIBE_SAGA_ERROR_MESSAGES.NOT_FOUND);

        throw err;
      }
      throw err;
    }
  }
}
