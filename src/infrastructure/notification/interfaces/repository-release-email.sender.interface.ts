import { GithubRelease } from '../../../../apps/tracker/src/modules/github';

export interface RepositoryReleaseNotificationSenderInterface {
  sendRepositoryReleaseNotification(
    to: string,
    release: GithubRelease,
    unsubscribeUrl: string,
  ): Promise<void>;
}
