import { SubscriptionResponse } from '../dto/subscription.response.dto';
import { Subscription } from '../types/subscription';

export class SubscriptionControllerMapper {
  toSubscriptionResponse(subscription: Subscription): SubscriptionResponse {
    return {
      email: subscription.email,
      repo: subscription.repo,
      confirmed: subscription.confirmed,
      last_seen_tag: subscription.lastSeenTag,
    };
  }

  toSubscriptionsResponse(subscriptions: Subscription[]): SubscriptionResponse[] {
    return subscriptions.map((sub) => this.toSubscriptionResponse(sub));
  }
}
