import { MessageResponse } from '../../../../libs/common/types/response';

export interface SubscriptionResponse {
  email: string;
  repo: string;
  confirmed: boolean;
  last_seen_tag: string | null;
}

export type SubscribeResponse = MessageResponse | (MessageResponse & { operationId: number });
