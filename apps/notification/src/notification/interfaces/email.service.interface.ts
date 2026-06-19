import { RepositoryRelease } from '../../../../../libs/contracts/notification/notification.contract';

export interface EmailServiceInterface {
  sendConfirmationEmail(to: string, confirmationUrl: string, repo: string): Promise<void>;
  sendConfirmationSuccessEmail(to: string, unsubscribeUrl: string, repo: string): Promise<void>;
  sendUnsubscribeSuccessEmail(to: string, repo: string): Promise<void>;

  sendGitHubReleaseEmail(
    to: string,
    release: RepositoryRelease,
    unsubscribeUrl: string,
  ): Promise<void>;
}
