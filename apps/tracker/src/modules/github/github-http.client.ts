import axios, { type AxiosInstance } from 'axios';
import {
  RepoExistenceResponse,
  GithubReleaseResponse,
  ServiceUnavailableResponse,
  ValidationErrorResponse,
} from '../../../../../libs/contracts/github/rest/github.contract';
import { githubRoutePathBuilder } from '../../../../../libs/contracts/github/rest/github.const';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubError } from '../../../../../libs/common/utils/errors/custom-errors';
import { GithubClientHttpMapper } from './mappers/github-http.mapper';
import { RepositoryRelease } from './types/repository-release';

type GithubErrorResponse = ValidationErrorResponse | ServiceUnavailableResponse;

export class GithubHttpClient implements GithubClientInterface {
  private readonly client: AxiosInstance;

  constructor(
    githubServiceUrl: string,
    private readonly mapper: GithubClientHttpMapper,
  ) {
    this.client = axios.create({
      timeout: 5_000,
      baseURL: githubServiceUrl,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error),
    );
  }

  async isRepositoryExists(fullRepoName: string): Promise<boolean> {
    const endpoint = githubRoutePathBuilder.getRepositoryExists(fullRepoName);
    const { data } = await this.client.get<RepoExistenceResponse>(endpoint);
    return data.exists;
  }

  async getLatestRelease(fullRepoName: string): Promise<RepositoryRelease | null> {
    const endpoint = githubRoutePathBuilder.getLatestRelease(fullRepoName);

    try {
      const { data } = await this.client.get<GithubReleaseResponse>(endpoint);
      return this.mapper.toRepositoryRelease(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }

  private handleError(err: unknown): never {
    if (!axios.isAxiosError<GithubErrorResponse>(err)) {
      throw err;
    }

    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 503 && this.hasServiceName(data)) {
      throw new GithubError(err);
    }

    throw err;
  }

  private hasServiceName(data: unknown): data is { serviceName: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'serviceName' in data &&
      typeof data.serviceName === 'string'
    );
  }
}
