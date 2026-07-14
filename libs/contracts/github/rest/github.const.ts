export const GITHUB_ROUTE_PATH_PARAMS = {
  OWNER: 'owner',
  REPO: 'repo',
} as const;

export const GITHUB_ROUTE_PATH_PATTERNS = {
  REPOSITORY_EXISTS: `/:${GITHUB_ROUTE_PATH_PARAMS.OWNER}/:${GITHUB_ROUTE_PATH_PARAMS.REPO}/exists`,
  LATEST_RELEASE: `/:${GITHUB_ROUTE_PATH_PARAMS.OWNER}/:${GITHUB_ROUTE_PATH_PARAMS.REPO}/latest-release`,
} as const;

export const githubRoutePathBuilder = {
  getRepositoryExists(fullRepoName: string): string {
    return `/${fullRepoName}/exists`;
  },
  getLatestRelease(fullRepoName: string): string {
    return `/${fullRepoName}/latest-release`;
  },
};
