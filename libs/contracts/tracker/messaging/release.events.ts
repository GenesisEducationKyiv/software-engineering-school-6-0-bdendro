export interface RepositoryReleaseDetectedEvent {
  id: number;
  repoName: string;
  tagName: string;
  name: string | null;
  htmlUrl: string;
  publishedAt: string | null;
}
