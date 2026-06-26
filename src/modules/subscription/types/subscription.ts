import { Repository } from '../../repository';

export interface Subscription {
  id: number;
  repositoryId: number;
  email: string;
  token: string;
  confirmed: boolean;
  createdAt: Date;
}

export type SubscriptionWithRepository = Subscription & {
  repository: Repository;
};
