import * as z from 'zod';
import {
  isoDateTimeSchema,
  numericIdSchema,
  repoSchema,
  trimmedStringSchema,
} from '../../../../../libs/common/utils/validation/common.schema';
import { TRACK_REPO_FAIL_REASONS } from '../../../../../libs/contracts/tracker/messaging/repository.commands';

export const subscribeSagaReplyPropertiesSchema = z.strictObject({
  correlationId: numericIdSchema,
});

export type SubscribeSagaReplyProperties = z.infer<typeof subscribeSagaReplyPropertiesSchema>;

const repositoryReplySchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  repo: repoSchema,
  lastSeenTag: z.string().trim().min(1).nullable(),
  createdAt: isoDateTimeSchema,
});

export const repositoryTrackSuccessReplySchema = z.strictObject({
  repository: repositoryReplySchema,
});

export type RepositoryTrackSuccessReply = z.infer<typeof repositoryTrackSuccessReplySchema>;

export const repositoryTrackFailedReplySchema = z.strictObject({
  error_reason: z.enum(TRACK_REPO_FAIL_REASONS),
  error_message: trimmedStringSchema,
});

export type RepositoryTrackFailedReply = z.infer<typeof repositoryTrackFailedReplySchema>;
