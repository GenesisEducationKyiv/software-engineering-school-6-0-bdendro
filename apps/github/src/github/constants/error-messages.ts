import { GITHUB_NAME } from './github.const';

export const GITHUB_ERROR_MESSAGES = {
  REPO_NOT_FOUND: `${GITHUB_NAME} repository not found or inaccessible.`,
  RELEASE_NOT_FOUND: `${GITHUB_NAME} repository release not found.`,
} as const;
