import { NextFunction, Request, Response } from 'express';
import { GithubRateLimiterInterface } from '../../modules/github/utils/github-rate-limiter';
import { GithubError } from '../utils/errors/custom-errors';
import { AppLogger } from '../../infrastructure/logger/interfaces/logger.interface';

export function getGithubRateLimitMiddleware(
  githubRateLimiter: GithubRateLimiterInterface,
  logger: AppLogger,
) {
  return function (_req: Request, _res: Response, next: NextFunction) {
    if (githubRateLimiter.isBlocked()) {
      logger.warn(
        `GitHub API is rate-limited [${githubRateLimiter.getRetryAfterSeconds()} seconds].`,
      );
      return next(new GithubError());
    }
    next();
  };
}
