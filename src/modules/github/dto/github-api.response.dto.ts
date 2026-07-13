import type { Endpoints } from '@octokit/types';

export type GithubRepositoryApiResponse =
  Endpoints['GET /repos/{owner}/{repo}']['response']['data'];

export type GithubLatestReleaseApiResponse =
  Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response']['data'];
