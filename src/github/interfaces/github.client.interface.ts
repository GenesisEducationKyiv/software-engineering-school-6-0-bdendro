export interface GitHubRepoDto {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
}

export interface GitHubLatestReleaseDto {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  body?: string | null;
  published_at: string | null;
}

export interface GithubClientInterface {
  getRepository(repo: string): Promise<GitHubRepoDto | null>;
  getLatestRelease(repo: string): Promise<GitHubLatestReleaseDto | null>;
}
