import { RateLimiter, RateLimiterInterface } from '../../common/utils/rate-limiter';

export interface GitHubRateLimitHeaders {
  'retry-after'?: string | number;
  'x-ratelimit-reset'?: string | number;
  'x-ratelimit-remaining'?: string | number;
}

export interface GithubRateLimiterInterface extends RateLimiterInterface {
  updateFromHeaders(headers: GitHubRateLimitHeaders, now?: Date): void;
}

export class GithubRateLimiter extends RateLimiter implements GithubRateLimiterInterface {
  updateFromHeaders(headers: GitHubRateLimitHeaders, now: Date = new Date()): void {
    const retryAfter = Number(headers['retry-after']);

    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      this.blockUntil(new Date(now.getTime() + retryAfter * 1000));
      return;
    }

    const remaining = Number(headers['x-ratelimit-remaining']);
    const reset = Number(headers['x-ratelimit-reset']);

    if (remaining === 0 && Number.isFinite(reset) && reset > 0) {
      this.blockUntil(new Date(reset * 1000));
      return;
    }

    this.blockUntil(new Date(now.getTime() + 60_000));
  }
}
