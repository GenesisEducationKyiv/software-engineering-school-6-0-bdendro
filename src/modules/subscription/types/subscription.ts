import { SubscriptionRepository } from '../../repository';
import { SubscriptionOperationStatuses } from '../constants/subscriptions.const';
import { SubscribeSagaErrorReason } from '../saga/constants/subscribe-saga.const';

export interface Subscription {
  id: number;
  repositoryId: number;
  email: string;
  token: string;
  confirmed: boolean;
  createdAt: Date;
}

export type SubscriptionWithRepository = Subscription & {
  repository: SubscriptionRepository;
};

export type SubscriptionOperationFail = {
  errorReason: SubscribeSagaErrorReason;
  errorMessage: string | null;
  status: SubscriptionOperationStatuses['FAILED'];
  startedAt: Date;
};

export type SubscriptionOperation =
  | { status: SubscriptionOperationStatuses['PENDING' | 'SUCCESS']; startedAt: Date }
  | SubscriptionOperationFail;
