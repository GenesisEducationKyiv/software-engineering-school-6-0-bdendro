export interface SubscriptionRepository {
  id: number;
  repo: string;
  lastSeenTag: string | null;
  createdAt: Date;
}
