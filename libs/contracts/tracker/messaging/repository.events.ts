interface Repository {
  id: number;
  repo: string;
  lastSeenTag: string | null;
  createdAt: string;
}

export type RepositoryTrackedEvent = Repository;

export type RepositoryUpdatedEvent = Repository;

export type RepositoryUntrackedEvent = Pick<Repository, 'id'>;
