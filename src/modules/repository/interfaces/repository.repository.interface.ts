import { SubscriptionRepository } from '../types/repository';
import { SubscriptionRepositoryCreateInput } from '../types/repository-repository';

export interface RepositoryRepositoryWritableInterface {
  createOrGet(repositoryInput: SubscriptionRepositoryCreateInput): Promise<SubscriptionRepository>;
  updateOrCreate(
    repositoryInput: SubscriptionRepositoryCreateInput,
  ): Promise<SubscriptionRepository>;
  deleteById(id: number): Promise<SubscriptionRepository>;
}
