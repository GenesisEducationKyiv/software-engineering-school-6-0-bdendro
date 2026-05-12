import { SubscriptionResponse } from '../dto/subscription.response.dto';
import { SubscriptionControllerMapperInterface } from '../interfaces/subscription.mapper.interface';
import { Subscription } from '../types/subscription';

export class SubscriptionControllerMapper implements SubscriptionControllerMapperInterface {
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
