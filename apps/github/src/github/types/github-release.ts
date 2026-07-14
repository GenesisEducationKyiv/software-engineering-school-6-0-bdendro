export interface GithubRelease {
  id: number;
  repoName: string;
  tagName: string;
  name: string | null;
  htmlUrl: string;
  publishedAt: string | null;
}
