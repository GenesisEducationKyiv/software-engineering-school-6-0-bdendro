import type {
  GithubLatestReleaseApiResponse,
  GithubRepositoryApiResponse,
} from '../dto/github-api.response.dto';
import type { GithubRelease } from '../types/github-release';
import type { GithubRepository } from '../types/github-repository';

export class GithubClientMapper {
  toRepository(repository: GithubRepositoryApiResponse): GithubRepository {
    return {
      id: repository.id,
      repoName: repository.full_name,
      private: repository.private,
      htmlUrl: repository.html_url,
    };
  }

  toLatestRelease(latestRelease: GithubLatestReleaseApiResponse, repoName: string): GithubRelease {
    return {
      id: latestRelease.id,
      repoName: repoName,
      tagName: latestRelease.tag_name,
      name: latestRelease.name,
      htmlUrl: latestRelease.html_url,
      publishedAt: latestRelease.published_at,
    };
  }
}
