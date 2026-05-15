import { ERROR_MESSAGES } from '../../common/utils/errors/get-error-message';
import { SUBSCRIPTION_NAME } from './subscriptions.const';

export const SUBSCRIPTION_ERROR_MESSAGES = {
  NOT_FOUND: ERROR_MESSAGES.getNotFoundMessage(SUBSCRIPTION_NAME),
  UNIQUE_TOKEN: ERROR_MESSAGES.getUniqueConstraintMessage(SUBSCRIPTION_NAME, 'token'),
  UNIQUE_EMAIL_REPO: ERROR_MESSAGES.getUniqueConstraintMessage(SUBSCRIPTION_NAME, ['email, repo']),
};
