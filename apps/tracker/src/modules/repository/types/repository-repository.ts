import { Repository } from './repository';

export type RepositoryCreateInput = Omit<Repository, 'id' | 'createdAt'>;
