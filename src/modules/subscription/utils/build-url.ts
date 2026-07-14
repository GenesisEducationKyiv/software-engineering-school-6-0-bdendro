import { SUBSCRIPTION_ROUTE_PATHS } from '../constants/subscriptions.const';

export function buildConfirmationUrl(subscriptionBaseUrl: string, token: string) {
  return `${subscriptionBaseUrl}/${SUBSCRIPTION_ROUTE_PATHS.CONFIRM}/${token}`;
}

export function buildUnsubscribeUrl(subscriptionBaseUrl: string, token: string) {
  return `${subscriptionBaseUrl}/${SUBSCRIPTION_ROUTE_PATHS.UNSUBSCRIBE}/${token}`;
}
