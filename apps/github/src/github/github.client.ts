import { AxiosInstance } from 'axios';
import axios from 'axios';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { Env } from '../config/config';
import { GITHUB_API_ENDPOINT, GITHUB_API_VERSION } from './constants/github.const';
import { GithubError } from '../../../../libs/common/utils/errors/custom-errors';
import { GithubRateLimiterInterface, GitHubRateLimitHeaders } from './utils/github-rate-limiter';
import { GithubRepository } from './types/github-repository';
import {
  GithubLatestReleaseApiResponse,
  GithubRepositoryApiResponse,
} from './dto/github-api.response.dto';
import { GithubRelease } from './types/github-release';
import { GithubClientMapperInterface } from './interfaces/github.mapper.interface';

export class GithubClient implements GithubClientInterface {
  private readonly client: AxiosInstance;

  constructor(
    private readonly rateLimiter: GithubRateLimiterInterface,
    private readonly mapper: GithubClientMapperInterface,
    env: Env,
  ) {
    this.client = axios.create({
      baseURL: env.GITHUB_API_URL,
      timeout: 5000,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    });

    this.setupInterceptors();
  }

  async getRepository(repo: string): Promise<GithubRepository | null> {
    try {
      const { data } = await this.client.get<GithubRepositoryApiResponse>(
        GITHUB_API_ENDPOINT.getRepoEndpoint(repo),
      );

      return this.mapper.toRepository(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404 || status === 403) return null; // repository not found or inaccessible

        throw new GithubError(err);
      } else if (err instanceof GithubError) throw err;
      throw new GithubError(err);
    }
  }

  async getLatestRelease(repo: string): Promise<GithubRelease | null> {
    try {
      const { data } = await this.client.get<GithubLatestReleaseApiResponse>(
        GITHUB_API_ENDPOINT.getRepoLastRelease(repo),
      );
      return this.mapper.toLatestRelease(data, repo);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) return null;

        throw new GithubError(err);
      } else if (err instanceof GithubError) throw err;
      throw new GithubError(err);
    }
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      if (this.rateLimiter.isBlocked()) {
        throw new GithubError(
          new Error(
            `GitHub API is rate-limited [${this.rateLimiter.getRetryAfterSeconds()} seconds].`,
          ),
        );
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!axios.isAxiosError(error)) {
          if (error instanceof Error) return Promise.reject(error);
          return Promise.reject(new Error(`${error}`));
        }

        const status = error.response?.status;
        const headers = (error.response?.headers ?? {}) as GitHubRateLimitHeaders;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const message = String(error.response?.data?.message ?? '').toLowerCase();
        const retryAfter = headers['retry-after'];
        const remaining = Number(headers['x-ratelimit-remaining']);

        const hasRateLimitSignal =
          retryAfter !== undefined || remaining === 0 || message.includes('rate limit');

        const isRateLimit = status === 429 || (status === 403 && hasRateLimitSignal);

        if (isRateLimit) {
          this.rateLimiter.updateFromHeaders(headers);
          return Promise.reject(new GithubError(error));
        }

        return Promise.reject(error);
      },
    );
  }
}
