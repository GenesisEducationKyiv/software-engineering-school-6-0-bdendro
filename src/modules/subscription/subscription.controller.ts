import { Response } from 'express';
import { SubscriptionControllerInterface } from './interfaces/subscription.controller.interface';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../../../libs/common/types/validated-request';
import { SubscribeBody, SubscriptionsQuery, TokenParams } from './schemas/subscription.schema';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { MessageResponse } from '../../../libs/common/types/response';
import { SubscribeResponse, SubscriptionResponse } from './dto/subscription.response.dto';
import { SubscriptionControllerMapper } from './mappers/subscription-controller.mapper';
import { SUBSCRIBE_STATUSES } from './constants/subscriptions.const';

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
    if (result.status === SUBSCRIBE_STATUSES.PENDING) {
      res.status(202).json({
        message: 'Processing subscription. Use operationId to check the status.',
        operationId: result.operationId,
      });
      return;
    }
    res.status(201).json({ message: 'Subscription successful. Confirmation email sent.' });
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
}
