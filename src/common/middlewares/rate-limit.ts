import { NextFunction, Request, Response } from 'express';
import { GithubRateLimiterInterface } from '../../github/utils/github-rate-limiter';
import { GithubError } from '../utils/errors/custom-errors';

export function getGithubRateLimitMiddleware(githubRateLimiter: GithubRateLimiterInterface) {
  return function (_req: Request, _res: Response, next: NextFunction) {
    if (githubRateLimiter.isBlocked()) {
      return next(
        new GithubError(
          new Error(
            `GitHub API is rate-limited [${githubRateLimiter.getRetryAfterSeconds()} seconds].`,
          ),
        ),
      );
    }
    next();
  };
}
