import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { GITHUB_ERROR_MESSAGES, GithubServiceInterface } from '../github';
import { RepositoryRepositoryInterface } from './interfaces/repository.repository.interface';
import { RepositoryServiceInterface } from './interfaces/repository.service.interface';
import { Repository } from './types/repository';

export class RepositoryService implements RepositoryServiceInterface {
  constructor(
    private readonly repositoryRepository: RepositoryRepositoryInterface,
    private readonly githubService: GithubServiceInterface,
  ) {}

  async getById(id: number): Promise<Repository | null> {
    return this.repositoryRepository.getById(id);
  }

  async getAll(): Promise<Repository[]> {
    return this.repositoryRepository.getAll();
  }

  async track(repo: string): Promise<Repository> {
    const isRepoExists = await this.githubService.isRepositoryExists(repo);
    if (!isRepoExists) throw new NotFoundError(GITHUB_ERROR_MESSAGES.REPO_NOT_FOUND);

    const repository = await this.repositoryRepository.getByRepoName(repo);
    if (repository) return repository;

    const release = await this.githubService.getLastRelease(repo);

    return this.repositoryRepository.createOrGet({ repo, lastSeenTag: release?.tagName || null });
  }

  async updateTag(id: number, lastSeenTag: string): Promise<Repository> {
    return this.repositoryRepository.updateTag(id, lastSeenTag);
  }
}
