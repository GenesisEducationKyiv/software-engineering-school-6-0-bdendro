import { GithubRelease } from '../types/github-release';
import { GithubRepository } from '../types/github-repository';

export interface GithubClientInterface {
  getRepository(repo: string): Promise<GithubRepository | null>;
  getLatestRelease(repo: string): Promise<GithubRelease | null>;
}
