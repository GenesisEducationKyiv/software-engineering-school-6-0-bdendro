import { GithubRelease } from '../types/github-release';

export interface GithubServiceInterface {
  ensureRepositoryExists(repo: string): Promise<void>;
  getLastRelease(repo: string): Promise<GithubRelease | null>;
}
