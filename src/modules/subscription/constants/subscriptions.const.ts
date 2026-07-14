export const SUBSCRIPTION_NAME = 'Subscription';

export const SUBSCRIPTION_ROUTE_PATHS = {
  SUBSCRIBE: 'subscribe',
  CONFIRM: 'confirm',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIPTIONS: 'subscriptions',
  SUBSCRIPTION_OPERATIONS: 'subscription-operations',

  // params names
  TOKEN: 'token',
  OPERATION_ID: 'operationId',
} as const;

export const SUBSCRIPTION_OPERATION_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type SubscriptionOperationStatuses = typeof SUBSCRIPTION_OPERATION_STATUSES;
