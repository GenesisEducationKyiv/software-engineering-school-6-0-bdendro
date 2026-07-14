import { MessageResponse, PendingResponse } from '../../../../libs/common/types/response';
import { SubscriptionOperationStatuses } from '../constants/subscriptions.const';

export interface SubscriptionResponse {
  email: string;
  repo: string;
  confirmed: boolean;
  last_seen_tag: string | null;
}

export type SubscribeResponse = MessageResponse | PendingResponse;

export type SubscriptionOperationPendingResponse = {
  status: SubscriptionOperationStatuses['PENDING'];
  startedAt: string;
};
export type SubscriptionOperationCompletedResponse = MessageResponse & {
  status: SubscriptionOperationStatuses['SUCCESS' | 'FAILED'];
  startedAt: string;
};

export type SubscriptionOperationResponse =
  | SubscriptionOperationCompletedResponse
  | SubscriptionOperationPendingResponse;
