import { GithubReleaseResponseInterface } from '../../github/dto/github.response.dto';

export interface GithubReleaseEmailServiceInterface {
  sendGitHubReleaseEmail(
    to: string,
    release: GithubReleaseResponseInterface,
    token: string,
  ): Promise<void>;
}
