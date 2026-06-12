import { GithubRelease } from '../../../modules/github';

export interface RepositoryReleaseNotificationSenderInterface {
  sendRepositoryReleaseNotification(
    to: string,
    release: GithubRelease,
    unsubscribeUrl: string,
  ): Promise<void>;
}
