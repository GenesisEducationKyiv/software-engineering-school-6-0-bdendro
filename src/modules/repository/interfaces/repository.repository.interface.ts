import { Repository } from '../types/repository';
import { RepositoryCreateInput } from '../types/repository-repository';

export interface RepositoryRepositoryInterface {
  getById(id: number): Promise<Repository | null>;
  getByRepoName(repoName: string): Promise<Repository | null>;
  getAll(): Promise<Repository[]>;
  create(repositoryInput: RepositoryCreateInput): Promise<Repository>;
  createOrGet(repositoryInput: RepositoryCreateInput): Promise<Repository>;
  updateTag(id: number, lastSeenTag: string): Promise<Repository>;
  delete(id: number): Promise<Repository>;
}
