import { Response } from 'express';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../../../../libs/common/types/validated-request';
import {
  GetSubscriptionOperationParams,
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
} from '../schemas/subscription.schema';
import { MessageResponse } from '../../../../libs/common/types/response';
import {
  SubscribeResponse,
  SubscriptionOperationResponse,
  SubscriptionResponse,
} from '../dto/subscription.response.dto';

export interface SubscriptionControllerInterface {
  subscribe(
    req: RequestWithValidatedBody<SubscribeBody>,
    res: Response<SubscribeResponse>,
  ): Promise<void>;

  confirm(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<MessageResponse>,
  ): Promise<void>;

  unsubscribe(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<MessageResponse>,
  ): Promise<void>;

  getSubscriptionsByEmail(
    req: RequestWithValidatedQuery<SubscriptionsQuery>,
    res: Response<SubscriptionResponse[]>,
  ): Promise<void>;

  getSubscriptionOperation(
    req: RequestWithValidatedParams<GetSubscriptionOperationParams>,
    res: Response<SubscriptionOperationResponse>,
  ): Promise<void>;
}
