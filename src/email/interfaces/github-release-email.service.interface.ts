import { GithubRelease } from '../../github/types/github-release';

export interface GithubReleaseEmailServiceInterface {
  sendGitHubReleaseEmail(to: string, release: GithubRelease, token: string): Promise<void>;
}
