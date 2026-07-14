import * as z from 'zod';
import {
  isoDateTimeSchema,
  repoSchema,
} from '../../../../libs/common/utils/validation/common.schema';

export const repositoryUpdatedEventSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  repo: repoSchema,
  lastSeenTag: z.string().trim().min(1),
  createdAt: isoDateTimeSchema,
});

export type RepositoryUpdatedEvent = z.infer<typeof repositoryUpdatedEventSchema>;
