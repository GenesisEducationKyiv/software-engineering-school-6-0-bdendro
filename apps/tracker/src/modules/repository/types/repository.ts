export interface Repository {
  id: number;
  repo: string;
  lastSeenTag: string | null;
  createdAt: Date;
}
