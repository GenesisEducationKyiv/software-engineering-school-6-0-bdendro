import { AxiosInstance } from 'axios';
import axios from 'axios';
import { Endpoints } from '@octokit/types';
import {
  GithubClientInterface,
  GitHubLatestReleaseDto,
  GitHubRepoDto,
} from './interfaces/github.client.interface';
import { Env } from '../config/env';
import { GITHUB_API_ENDPOINT, GITHUB_API_VERSION } from './constants/github.const';
import { GithubError } from '../common/utils/errors/custom-errors';
import { GithubRateLimiterInterface, GitHubRateLimitHeaders } from './utils/github-rate-limiter';

type GitHubGetRepoResponse = Endpoints['GET /repos/{owner}/{repo}']['response']['data'];

type GitHubGetLatestReleaseResponse =
  Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response']['data'];

export class GithubClient implements GithubClientInterface {
  private readonly client: AxiosInstance;

  constructor(
    private readonly rateLimiter: GithubRateLimiterInterface,
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

  async getRepository(repo: string): Promise<GitHubRepoDto | null> {
    try {
      const { data } = await this.client.get<GitHubGetRepoResponse>(
        GITHUB_API_ENDPOINT.getRepoEndpoint(repo),
      );

      return {
        id: data.id,
        full_name: data.full_name,
        private: data.private,
        html_url: data.html_url,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404 || status === 403) return null; // repository not found or inaccessible

        throw new GithubError(err);
      } else if (err instanceof GithubError) throw err;
      throw new GithubError(err);
    }
  }

  async getLatestRelease(repo: string): Promise<GitHubLatestReleaseDto | null> {
    try {
      const { data } = await this.client.get<GitHubGetLatestReleaseResponse>(
        GITHUB_API_ENDPOINT.getRepoLastRelease(repo),
      );
      return {
        id: data.id,
        tag_name: data.tag_name,
        name: data.name,
        html_url: data.html_url,
        body: data.body,
        published_at: data.published_at,
      };
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
      this.rateLimiter.clearIfExpired();

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
