import * as grpc from '@grpc/grpc-js';
import {
  CheckRepositoryExistsRequest,
  CheckRepositoryExistsResponse,
  GetLatestReleaseRequest,
  GetLatestReleaseResponse,
} from '../../../../libs/contracts/grpc/github/v1/github';
import {
  ExternalServiceError,
  NotFoundError,
} from '../../../../libs/common/utils/errors/custom-errors';
import { GithubServiceInterface } from './interfaces/github.service.interface';
import { concatOwnerRepo } from './utils/github';
import { GITHUB_ERROR_MESSAGES } from './constants/error-messages';

export class GithubGrpcHandler {
  constructor(private readonly githubService: GithubServiceInterface) {}

  checkRepositoryExists(
    call: grpc.ServerUnaryCall<CheckRepositoryExistsRequest, CheckRepositoryExistsResponse>,
    callback: grpc.sendUnaryData<CheckRepositoryExistsResponse>,
  ): void {
    void this.handleCall(call, callback, async (request) => {
      const fullRepoName = concatOwnerRepo(request.owner, request.repo);
      const exists = await this.githubService.isRepoExists(fullRepoName);
      return { exists };
    });
  }

  getLatestRelease(
    call: grpc.ServerUnaryCall<GetLatestReleaseRequest, GetLatestReleaseResponse>,
    callback: grpc.sendUnaryData<GetLatestReleaseResponse>,
  ): void {
    void this.handleCall(call, callback, async (request) => {
      const fullRepoName = concatOwnerRepo(request.owner, request.repo);
      const release = await this.githubService.getLastRelease(fullRepoName);
      if (!release) throw new NotFoundError(GITHUB_ERROR_MESSAGES.RELEASE_NOT_FOUND);
      return {
        id: release.id,
        repoName: release.repoName,
        tagName: release.tagName,
        name: release.name ?? undefined,
        htmlUrl: release.htmlUrl,
        publishedAt: release.publishedAt ?? undefined,
      };
    });
  }

  private async handleCall<TReq, TRes>(
    call: grpc.ServerUnaryCall<TReq, TRes>,
    callback: grpc.sendUnaryData<TRes>,
    handlerLogic: (request: TReq) => Promise<TRes>,
  ): Promise<void> {
    try {
      const result = await handlerLogic(call.request);

      callback(null, result);
    } catch (error) {
      const grpcError = this.mapError(error);
      callback(grpcError, null);
    }
  }

  private mapError(error: unknown): grpc.ServiceError {
    const grpcError: Partial<grpc.ServiceError> = {
      name: 'GrpcError',
      message: 'Internal server error',
      code: grpc.status.INTERNAL,
    };

    if (error instanceof NotFoundError) {
      grpcError.code = grpc.status.NOT_FOUND;
      grpcError.message = error.message;
    } else if (error instanceof ExternalServiceError) {
      grpcError.code = grpc.status.UNAVAILABLE;
      grpcError.message = error.message;
    }

    return grpcError as grpc.ServiceError;
  }
}
