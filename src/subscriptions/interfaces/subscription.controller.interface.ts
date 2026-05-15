import { Response } from 'express';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../../common/types/validated-request';
import { SubscribeBody, SubscriptionsQuery, TokenParams } from '../schemas/subscription.schema';
import { ResponseMessage } from '../../common/types/response';
import { SubscriptionResponseDTO } from '../dto/subscription.response.dto';

export interface SubscriptionControllerInterface {
  subscribe(
    req: RequestWithValidatedBody<SubscribeBody>,
    res: Response<ResponseMessage>,
  ): Promise<void>;

  confirm(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<ResponseMessage>,
  ): Promise<void>;

  unsubscribe(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<ResponseMessage>,
  ): Promise<void>;

  getSubscriptionsByEmail(
    req: RequestWithValidatedQuery<SubscriptionsQuery>,
    res: Response<SubscriptionResponseDTO[]>,
  ): Promise<void>;
}
