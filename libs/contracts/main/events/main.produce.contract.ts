import { RepositoryReleaseDetectedEvent } from '../../tracker/events/scanner.produce.contract';

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
