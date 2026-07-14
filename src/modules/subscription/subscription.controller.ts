import { Response } from 'express';
import { SubscriptionControllerInterface } from './interfaces/subscription.controller.interface';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../../../libs/common/types/validated-request';
import {
  GetSubscriptionOperationParams,
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
} from './schemas/subscription.schema';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { MessageResponse } from '../../../libs/common/types/response';
import {
  SubscribeResponse,
  SubscriptionOperationResponse,
  SubscriptionResponse,
} from './dto/subscription.response.dto';
import { SubscriptionControllerMapper } from './mappers/subscription-controller.mapper';
import { SUBSCRIPTION_OPERATION_STATUSES } from './constants/subscriptions.const';
import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';

const SUBSCRIBE_SUCCESS_MESSAGE = 'Subscription successful. Confirmation email sent.';

export class SubscriptionController implements SubscriptionControllerInterface {
  constructor(
    private readonly subscriptionService: SubscriptionServiceInterface,
    private readonly mapper: SubscriptionControllerMapper,
  ) {}

  async subscribe(
    req: RequestWithValidatedBody<SubscribeBody>,
    res: Response<SubscribeResponse>,
  ): Promise<void> {
    const result = await this.subscriptionService.subscribe(req.validated.body);
    if (result.status === SUBSCRIPTION_OPERATION_STATUSES.PENDING) {
      res.status(202).json({
        message: 'Processing subscription. Use operationId to check the status.',
        operationId: result.operationId.toString(),
      });
      return;
    }
    res.status(201).json({ message: SUBSCRIBE_SUCCESS_MESSAGE });
  }

  async confirm(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    await this.subscriptionService.confirm(req.validated.params.token);
    res.status(200).json({ message: 'Subscription confirmed successfully' });
  }

  async unsubscribe(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    await this.subscriptionService.unsubscribe(req.validated.params.token);
    res.status(200).json({ message: 'Unsubscribed successfully' });
  }

  async getSubscriptionsByEmail(
    req: RequestWithValidatedQuery<SubscriptionsQuery>,
    res: Response<SubscriptionResponse[]>,
  ): Promise<void> {
    const subscriptions = await this.subscriptionService.getSubscriptionsWithRepoByEmail(
      req.validated.query.email,
    );
    res.status(200).json(this.mapper.toSubscriptionsResponse(subscriptions));
  }

  async getSubscriptionOperation(
    req: RequestWithValidatedParams<GetSubscriptionOperationParams>,
    res: Response<SubscriptionOperationResponse>,
  ): Promise<void> {
    const subscriptionOperation = await this.subscriptionService.getSubscriptionOperation(
      req.validated.params.operationId,
    );

    if (!subscriptionOperation)
      throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.OPERATION_NOT_ROUND);

    const message =
      subscriptionOperation.status === SUBSCRIPTION_OPERATION_STATUSES.SUCCESS
        ? SUBSCRIBE_SUCCESS_MESSAGE
        : undefined;

    const response = this.mapper.toSubscriptionOperationResponse(subscriptionOperation, message);

    res.status(200).json(response);
  }
}
