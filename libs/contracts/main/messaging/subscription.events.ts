export interface RepositoryRelease {
  id: number;
  repoName: string;
  tagName: string;
  name: string | null;
  htmlUrl: string;
  publishedAt: string | null;
}

export interface SubscriptionCreatedEvent {
  email: string;
  confirmationUrl: string;
  repo: string;
}

export interface SubscriptionConfirmedEvent {
  email: string;
  unsubscribeUrl: string;
  repo: string;
}

export interface SubscriptionUnsubscribedEvent {
  email: string;
  repo: string;
}

export interface SubscriptionRepositoryReleasedEvent {
  email: string;
  release: RepositoryRelease;
  unsubscribeUrl: string;
}
