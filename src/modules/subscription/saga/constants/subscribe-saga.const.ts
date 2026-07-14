import { ERROR_MESSAGES } from '../../../../../libs/common/utils/errors/get-error-message';

export const SUBSCRIBE_SAGA_NAME = 'Subscribe Saga';

export const SUBSCRIBE_SAGA_STATES = {
  STARTED: 'STARTED',
  REPOSITORY_TRACKED: 'REPOSITORY_TRACKED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  COMPENSATED: 'COMPENSATED',
} as const;

export type SubscribeSagaState = (typeof SUBSCRIBE_SAGA_STATES)[keyof typeof SUBSCRIBE_SAGA_STATES];

export const SUBSCRIBE_SAGA_ERROR_REASON = {
  GITHUB_REPO_NOT_FOUND: 'GITHUB_REPO_NOT_FOUND',
  SUBSCRIPTION_ALREADY_EXISTS: 'SUBSCRIPTION_ALREADY_EXISTS',
  UNKNOWN: 'UNKNOWN',
} as const;

export const SUBSCRIBE_SAGA_UNKNOWN_ERROR_MESSAGE = 'Unknown error.';

export type SubscribeSagaErrorReason =
  (typeof SUBSCRIBE_SAGA_ERROR_REASON)[keyof typeof SUBSCRIBE_SAGA_ERROR_REASON];

export const SUBSCRIBE_SAGA_ERROR_MESSAGES = {
  NOT_FOUND: ERROR_MESSAGES.getNotFoundMessage(SUBSCRIBE_SAGA_NAME),
};
