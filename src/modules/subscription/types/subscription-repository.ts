import { Subscription } from './subscription';

export type SubscriptionCreateInput = Omit<Subscription, 'id' | 'createdAt' | 'confirmed'> & {
  repositoryId: number;
} & Partial<Pick<Subscription, 'confirmed'>>;

export type SubscriptionUpdateInput = Partial<Omit<Subscription, 'id' | 'createdAt'>>;
