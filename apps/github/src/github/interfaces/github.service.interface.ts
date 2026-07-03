import { GithubRelease } from '../types/github-release';

export interface GithubServiceInterface {
  isRepoExists(repo: string): Promise<boolean>;
  getLastRelease(repo: string): Promise<GithubRelease | null>;
}
