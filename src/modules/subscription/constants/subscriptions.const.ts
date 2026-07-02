export const SUBSCRIPTION_NAME = 'Subscription';

export const SUBSCRIPTION_ROUTE_PATHS = {
  SUBSCRIBE: 'subscribe',
  CONFIRM: 'confirm',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIPTIONS: 'subscriptions',

  // params names
  TOKEN: 'token',
} as const;

export const SUBSCRIBE_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type SubscribeStatuses = typeof SUBSCRIBE_STATUSES;
