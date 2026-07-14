import { credentials, status } from '@grpc/grpc-js';
import type { ServiceError } from '@grpc/grpc-js';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubServiceClient } from '../../../../../libs/contracts/grpc/github/v1/github';
import { RepositoryRelease } from './types/repository-release';
import { GithubError, NotFoundError } from '../../../../../libs/common/utils/errors/custom-errors';
import { parseFullRepoName } from './utils/github';
import { GithubClientGrpcMapper } from './mappers/github-grpc.mapper';

export class GithubGrpcClient implements GithubClientInterface {
  private readonly client: GithubServiceClient;

  constructor(
    targetAddress: string,
    private readonly mapper: GithubClientGrpcMapper,
  ) {
    this.client = new GithubServiceClient(targetAddress, credentials.createInsecure());
  }

  public async isRepositoryExists(fullRepoName: string): Promise<boolean> {
    const { owner, repo } = parseFullRepoName(fullRepoName);

    return new Promise((resolve, reject) => {
      this.client.checkRepositoryExists({ owner, repo }, (error, response) => {
        if (error) {
          try {
            this.handleError(error);
          } catch (mappedError) {
            return reject(mappedError as Error);
          }
        }

        resolve(response.exists);
      });
    });
  }

  public async getLatestRelease(fullRepoName: string): Promise<RepositoryRelease | null> {
    const { owner, repo } = parseFullRepoName(fullRepoName);

    return new Promise((resolve, reject) => {
      this.client.getLatestRelease({ owner, repo }, (error, response) => {
        if (error) {
          if (error.code === status.NOT_FOUND) {
            return resolve(null);
          }

          try {
            this.handleError(error);
          } catch (mappedError) {
            return reject(mappedError as Error);
          }
        }

        resolve(this.mapper.toRepositoryRelease(response));
      });
    });
  }

  private handleError(err: unknown): never {
    const grpcError = err as ServiceError;
    if (grpcError && typeof grpcError.code === 'number') {
      switch (grpcError.code) {
        case status.UNAVAILABLE:
          throw new GithubError(grpcError.message);

        case status.NOT_FOUND:
          throw new NotFoundError(grpcError.message);

        default:
          throw err;
      }
    }
    throw err;
  }
}
