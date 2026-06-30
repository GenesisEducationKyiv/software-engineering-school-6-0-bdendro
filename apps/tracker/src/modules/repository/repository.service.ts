import { NotFoundError } from '../../../../../libs/common/utils/errors/custom-errors';
import { GithubServiceInterface } from '../github';
import { RepositoryRepositoryInterface } from './interfaces/repository.repository.interface';
import { RepositoryServiceInterface } from './interfaces/repository.service.interface';
import { RepositoryEventProducer } from './repository-event.producer';
import { Repository } from './types/repository';

export class RepositoryService implements RepositoryServiceInterface {
  constructor(
    private readonly repositoryRepository: RepositoryRepositoryInterface,
    private readonly githubService: GithubServiceInterface,
    private readonly eventProducer: RepositoryEventProducer,
  ) {}

  async getById(id: number): Promise<Repository | null> {
    return this.repositoryRepository.getById(id);
  }

  async getAll(): Promise<Repository[]> {
    return this.repositoryRepository.getAll();
  }

  async track(repo: string): Promise<Repository> {
    await this.githubService.ensureRepositoryExists(repo);

    const repository = await this.repositoryRepository.getByRepoName(repo);
    if (repository) {
      await this.eventProducer.produceRepositoryTracked(repository);
      return repository;
    }

    const release = await this.githubService.getLastRelease(repo);

    const foundRepository = await this.repositoryRepository.createOrGet({
      repo,
      lastSeenTag: release?.tagName || null,
    });
    await this.eventProducer.produceRepositoryTracked(foundRepository);
    return foundRepository;
  }

  async updateTag(id: number, lastSeenTag: string): Promise<Repository> {
    const repository = await this.repositoryRepository.updateTag(id, lastSeenTag);
    await this.eventProducer.produceRepositoryUpdated(repository);
    return repository;
  }

  async untrack(id: number): Promise<void> {
    try {
      await this.repositoryRepository.delete(id);
    } catch (err) {
      if (err instanceof NotFoundError) return;

      throw err;
    }
  }
}
