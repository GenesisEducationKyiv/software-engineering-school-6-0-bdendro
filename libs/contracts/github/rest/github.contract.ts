import * as z from 'zod';
import { MessageResponse, ValidationErrorResponse } from '../../../common/types/response';
import { GITHUB_ROUTE_PATH_PARAMS } from './github.const';

// Response
export type { MessageResponse };

export type { ValidationErrorResponse };

export type ServiceUnavailableResponse = MessageResponse & { serviceName: string };

// Request
export const repoParamsSchema = z.strictObject({
  [GITHUB_ROUTE_PATH_PARAMS.OWNER]: z.string().trim().toLowerCase(),
  [GITHUB_ROUTE_PATH_PARAMS.REPO]: z.string().trim().toLowerCase(),
});

export type RepoParams = z.infer<typeof repoParamsSchema>;

// GET /:repo/exists
// - 200: ResponseMessage
// - 400: ResponseMessage | ValidationErrorResponse
// - 503: ResponseMessage | ServiceUnavailableResponse
export interface RepoExistenceResponse {
  exists: boolean;
}

// GET /:repo/latest-release
// - 200: GithubReleaseResponse
// - 400: ResponseMessage | ValidationErrorResponse
// - 404: ResponseMessage
// - 503: ResponseMessage | ServiceUnavailableResponse
export interface GithubReleaseResponse {
  id: number;
  repoName: string;
  tagName: string;
  name: string | null;
  htmlUrl: string;
  publishedAt: string | null;
}
