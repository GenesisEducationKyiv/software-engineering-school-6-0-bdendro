import { NotFoundError } from '../../../../../libs/common/utils/errors/custom-errors';
import { GITHUB_ERROR_MESSAGES } from './constants/error-messages';
import { GithubClientInterface } from './interfaces/github.client.interface';
import { GithubServiceInterface } from './interfaces/github.service.interface';
import { GithubRelease } from './types/github-release';

export class GithubService implements GithubServiceInterface {
  constructor(private readonly githubClient: GithubClientInterface) {}

  async ensureRepositoryExists(repo: string): Promise<void> {
    const repository = await this.githubClient.getRepository(repo);
    if (!repository) throw new NotFoundError(GITHUB_ERROR_MESSAGES.REPO_NOT_FOUND);
  }

  async getLastRelease(repo: string): Promise<GithubRelease | null> {
    return await this.githubClient.getLatestRelease(repo);
  }
}
