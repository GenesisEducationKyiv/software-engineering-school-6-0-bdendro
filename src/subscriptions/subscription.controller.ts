import { Response } from 'express';
import { SubscriptionControllerInterface } from './interfaces/subscription.controller.interface';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../common/types/validated-request';
import { SubscribeBody, SubscriptionsQuery, TokenParams } from './schemas/subscription.schema';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { ResponseMessage } from '../common/types/response';
import { SubscriptionResponseDTO } from './dto/subscription.response.dto';

export class SubscriptionController implements SubscriptionControllerInterface {
  constructor(private readonly subscriptionService: SubscriptionServiceInterface) {}

  async subscribe(
    req: RequestWithValidatedBody<SubscribeBody>,
    res: Response<ResponseMessage>,
  ): Promise<void> {
    await this.subscriptionService.subscribe(req.validated.body);
    res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
  }

  async confirm(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<ResponseMessage>,
  ): Promise<void> {
    await this.subscriptionService.confirm(req.validated.params.token);
    res.status(200).json({ message: 'Subscription confirmed successfully' });
  }

  async unsubscribe(
    req: RequestWithValidatedParams<TokenParams>,
    res: Response<ResponseMessage>,
  ): Promise<void> {
    await this.subscriptionService.unsubscribe(req.validated.params.token);
    res.status(200).json({ message: 'Unsubscribed successfully' });
  }

  async getSubscriptionsByEmail(
    req: RequestWithValidatedQuery<SubscriptionsQuery>,
    res: Response<SubscriptionResponseDTO[]>,
  ): Promise<void> {
    const subscriptions = await this.subscriptionService.getSubscriptionsByEmail(
      req.validated.query.email,
    );
    res.status(200).json(subscriptions);
  }
}
