import { SubscribeSagaErrorReason } from '../constants/subscribe-saga.const';

export interface SubscribeSaga {
  id: number;
  email: string;
  repoName: string;
  repoId: number | null;
  subscriptionId: number | null;
  state: string;
  errorReason: SubscribeSagaErrorReason | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
