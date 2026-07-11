import { Subscription } from './subscription';

export type SubscriptionUpdateInput = Partial<Omit<Subscription, 'id' | 'createdAt'>>;
