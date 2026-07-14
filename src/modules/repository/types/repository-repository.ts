import { SubscriptionRepository } from './repository';

export type SubscriptionRepositoryCreateInput = Omit<SubscriptionRepository, 'createdAt'> & {
  createdAt: string;
};
