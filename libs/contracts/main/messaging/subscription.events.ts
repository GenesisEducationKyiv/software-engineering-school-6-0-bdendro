import { RepositoryReleaseDetectedEvent } from '../../tracker/messaging/release.events';

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
  release: RepositoryReleaseDetectedEvent;
  unsubscribeUrl: string;
}
