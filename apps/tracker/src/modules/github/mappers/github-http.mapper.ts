import { RepositoryRelease } from '../types/repository-release';
import { GithubReleaseResponse } from '../../../../../../libs/contracts/github/rest/github.contract';

export class GithubClientHttpMapper {
  toRepositoryRelease(release: GithubReleaseResponse): RepositoryRelease {
    return {
      id: release.id,
      repoName: release.repoName,
      tagName: release.tagName,
      name: release.name,
      htmlUrl: release.htmlUrl,
      publishedAt: release.publishedAt,
    };
  }
}
