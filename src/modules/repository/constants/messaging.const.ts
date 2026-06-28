export const SUBSCRIPTION_REPOSITORY_QUEUE = 'subscription.repository.queue';

export const SUBSCRIPTION_REPOSITORY_RETRY_EXCHANGE = 'subscription.repository.retry';
export const SUBSCRIPTION_REPOSITORY_RETRY_QUEUE = 'subscription.repository.retry.queue';

export const RETRY_TIME_IN_MS = {
  SUBSCRIPTION_REPOSITORY: 10_000,
} as const;
