import { SubscribeSagaErrorReason } from '../constants/subscribe-saga.const';
import { SubscribeSaga } from '../types/subscribe-saga';
import { SubscribeSagaCreateInput } from '../types/subscribe-saga-repository';

export interface SubscribeSagaRepository {
  getById(id: number): Promise<SubscribeSaga | null>;
  create(createSagaInput: SubscribeSagaCreateInput): Promise<SubscribeSaga>;
  markRepoTracked(id: number, repoId: number): Promise<SubscribeSaga>;
  markCompleted(id: number, subscriptionId: number): Promise<SubscribeSaga>;
  markFailed(
    id: number,
    errorReason: SubscribeSagaErrorReason,
    errorMessage: string,
  ): Promise<SubscribeSaga>;
  markCompensated(id: number, removeRepoId: boolean): Promise<SubscribeSaga>;
}
