import { GithubReleaseResponseInterface } from '../../github/dto/github.response.dto';

export interface EmailServiceInterface {
  sendConfirmationEmail(to: string, token: string, repo: string): Promise<void>;
  sendConfirmationSuccessEmail(to: string, token: string, repo: string): Promise<void>;
  sendUnsubscribeSuccessEmail(to: string, repo: string): Promise<void>;
  sendGitHubReleaseEmail(
    to: string,
    release: GithubReleaseResponseInterface,
    token: string,
  ): Promise<void>;
}
