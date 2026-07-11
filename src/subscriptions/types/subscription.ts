export interface Subscription {
  id: number;
  email: string;
  repo: string;
  token: string;
  confirmed: boolean;
  lastSeenTag: string | null;
  createdAt: Date;
}
