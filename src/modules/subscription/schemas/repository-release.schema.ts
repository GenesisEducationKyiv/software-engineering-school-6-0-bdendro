import * as z from 'zod';
import {
  nullableIsoDateTimeSchema,
  nullableTrimmedStringSchema,
  repoSchema,
  urlSchema,
} from '../../../../libs/common/utils/validation/common.schema';

export const repositoryReleaseDetectedEventSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  repoName: repoSchema,
  tagName: z.string().trim().min(1),
  name: nullableTrimmedStringSchema,
  htmlUrl: urlSchema,
  publishedAt: nullableIsoDateTimeSchema,
});

export type RepositoryReleaseDetectedEvent = z.infer<typeof repositoryReleaseDetectedEventSchema>;
