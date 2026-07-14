import { RepositoryRelease } from '../types/repository-release';
import { GetLatestReleaseResponse } from '../../../../../../libs/contracts/grpc/github/v1/github';

export class GithubClientGrpcMapper {
  toRepositoryRelease(release: GetLatestReleaseResponse): RepositoryRelease {
    return {
      id: release.id,
      repoName: release.repoName,
      tagName: release.tagName,
      name: release.name ?? null,
      htmlUrl: release.htmlUrl,
      publishedAt: release.publishedAt ?? null,
    };
  }
}
