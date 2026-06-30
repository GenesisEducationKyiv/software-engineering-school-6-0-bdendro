import * as z from 'zod';
import {
  numericIdSchema,
  repoSchema,
} from '../../../../libs/common/utils/validation/common.schema';
// --- Commands ---
// Properties
export const repositoryCommandPropertiesSchema = z.strictObject({
  correlationId: z.string(),
  replyTo: z.string(),
});

export type RepositoryCommandProperties = z.infer<typeof repositoryCommandPropertiesSchema>;

// Track
export const trackRepositoryCommandSchema = z.strictObject({
  repo: repoSchema,
});

export type TrackRepositoryCommand = z.infer<typeof trackRepositoryCommandSchema>;

// Untrack
export const untrackRepositoryCommandSchema = z.strictObject({
  repoId: numericIdSchema,
});

export type UntrackRepositoryCommand = z.infer<typeof untrackRepositoryCommandSchema>;

// --- Replies ---
// Track
export const TRACKER_REPOSITORY_REPLY_TYPES = {
  TRACK_SUCCESS: 'TRACK_REPOSITORY_SUCCESS',
  TRACK_FAILED: 'TRACK_REPOSITORY_SUCCESS',
} as const;

export interface Repository {
  id: number;
  repo: string;
  lastSeenTag: string | null;
  createdAt: string;
}

export interface TrackRepositorySuccessReply {
  repository: Repository;
}

export const TRACK_REPO_FAIL_REASONS = {
  GITHUB_REPO_NOT_FOUND: 'GITHUB_REPO_NOT_FOUND',
} as const;

export type TrackRepoFailReason =
  (typeof TRACK_REPO_FAIL_REASONS)[keyof typeof TRACK_REPO_FAIL_REASONS];

export interface TrackRepositoryFailedReply {
  error_reason: TrackRepoFailReason;
  error_message: string;
}
