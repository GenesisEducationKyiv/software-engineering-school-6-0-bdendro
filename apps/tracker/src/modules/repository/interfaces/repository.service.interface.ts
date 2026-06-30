import { Repository } from '../types/repository';

export interface RepositoryServiceInterface {
  getById(id: number): Promise<Repository | null>;
  getAll(): Promise<Repository[]>;
  track(repo: string): Promise<Repository>;
  updateTag(id: number, lastSeenTag: string): Promise<Repository>;
  untrack(id: number): Promise<void>;
}
