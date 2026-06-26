import { SubscriptionResponse } from '../dto/subscription.response.dto';
import { SubscriptionWithRepository } from '../types/subscription';

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
}
