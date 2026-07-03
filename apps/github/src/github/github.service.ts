import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubServiceInterface } from './interfaces/github.service.interface';
import { GithubRelease } from './types/github-release';

export class GithubService implements GithubServiceInterface {
  constructor(private readonly githubClient: GithubClientInterface) {}

  async isRepoExists(repo: string): Promise<boolean> {
    const repository = await this.githubClient.getRepository(repo);
    return !!repository;
  }

  async getLastRelease(repo: string): Promise<GithubRelease | null> {
    return await this.githubClient.getLatestRelease(repo);
  }
}
