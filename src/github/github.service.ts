import { GithubReleaseResponseInterface } from './dto/github.response.dto';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubServiceInterface } from './interfaces/github.service.interface';

export class GithubService implements GithubServiceInterface {
  constructor(private readonly githubClient: GithubClientInterface) {}

  async isRepositoryExists(repo: string): Promise<boolean> {
    const repository = await this.githubClient.getRepository(repo);
    if (!repository) return false;
    return true;
  }

  async getLastRelease(repo: string): Promise<GithubReleaseResponseInterface | null> {
    const release = await this.githubClient.getLatestRelease(repo);
    if (!release) return null;
    return {
      repo,
      lastSeenTag: release.tag_name,
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
    };
  }
}
