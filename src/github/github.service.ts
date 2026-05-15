import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubServiceInterface } from './interfaces/github.service.interface';
import { GithubRelease } from './types/github-release';

export class GithubService implements GithubServiceInterface {
  constructor(private readonly githubClient: GithubClientInterface) {}

  async isRepositoryExists(repo: string): Promise<boolean> {
    const repository = await this.githubClient.getRepository(repo);
    if (!repository) return false;
    return true;
  }

  async getLastRelease(repo: string): Promise<GithubRelease | null> {
    return await this.githubClient.getLatestRelease(repo);
  }
}
