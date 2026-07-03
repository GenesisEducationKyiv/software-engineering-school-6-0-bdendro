import { RepositoryRelease } from '../../../../libs/contracts/main/messaging/subscription.events';

export interface RepositoryReleaseNotificationSenderInterface {
  sendRepositoryReleaseNotification(
    to: string,
    release: RepositoryRelease,
    unsubscribeUrl: string,
  ): Promise<void>;
}
