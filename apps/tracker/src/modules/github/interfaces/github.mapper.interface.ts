import {
  GithubLatestReleaseApiResponse,
  GithubRepositoryApiResponse,
} from '../dto/github-api.response.dto';
import { GithubRelease } from '../types/github-release';
import { GithubRepository } from '../types/github-repository';

export interface GithubClientMapperInterface {
  toRepository(repository: GithubRepositoryApiResponse): GithubRepository;
  toLatestRelease(latestRelease: GithubLatestReleaseApiResponse, repoName: string): GithubRelease;
}
