import { RepositoryRelease } from '../types/repository-release';

export interface GithubClientInterface {
  isRepositoryExists(fullRepoName: string): Promise<boolean>;
  getLatestRelease(fullRepoName: string): Promise<RepositoryRelease | null>;
}
