import { SUBSCRIPTION_OPERATION_STATUSES } from '../constants/subscriptions.const';
import {
  SubscriptionOperationPendingResponse,
  SubscriptionOperationResponse,
  SubscriptionResponse,
} from '../dto/subscription.response.dto';
import { SUBSCRIBE_SAGA_UNKNOWN_ERROR_MESSAGE } from '../saga/constants/subscribe-saga.const';
import { SubscriptionOperation, SubscriptionWithRepository } from '../types/subscription';

export class SubscriptionControllerMapper {
  toSubscriptionResponse(subscription: SubscriptionWithRepository): SubscriptionResponse {
    return {
      email: subscription.email,
      repo: subscription.repository.repo,
      confirmed: subscription.confirmed,
      last_seen_tag: subscription.repository.lastSeenTag,
    };
  }

  toSubscriptionsResponse(subscriptions: SubscriptionWithRepository[]): SubscriptionResponse[] {
    return subscriptions.map((sub) => this.toSubscriptionResponse(sub));
  }

  toSubscriptionOperationResponse(
    subscriptionOperation: SubscriptionOperation,
    message?: string,
  ): SubscriptionOperationResponse {
    const base = {
      status: subscriptionOperation.status,
      startedAt: subscriptionOperation.startedAt.toISOString(),
    };

    if (subscriptionOperation.status === SUBSCRIPTION_OPERATION_STATUSES.PENDING)
      return base as SubscriptionOperationPendingResponse;

    if (subscriptionOperation.status === SUBSCRIPTION_OPERATION_STATUSES.FAILED)
      return {
        ...base,
        message: subscriptionOperation.errorMessage ?? SUBSCRIBE_SAGA_UNKNOWN_ERROR_MESSAGE,
      };

    return {
      ...base,
      message: message ?? 'Operation completed successfully',
    };
  }
}
