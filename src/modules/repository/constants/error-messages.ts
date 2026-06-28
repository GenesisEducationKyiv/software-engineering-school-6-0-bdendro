import { ERROR_MESSAGES } from '../../../../libs/common/utils/errors/get-error-message';
import { REPOSITORY_NAME } from './repository.const';

export const REPOSITORY_ERROR_MESSAGES = {
  NOT_FOUND: ERROR_MESSAGES.getNotFoundMessage(REPOSITORY_NAME),
  UNIQUE_REPO_NAME: ERROR_MESSAGES.getUniqueConstraintMessage(REPOSITORY_NAME, ['repoName']),
  IN_USE: ERROR_MESSAGES.getInUseMessage(REPOSITORY_NAME),
};
