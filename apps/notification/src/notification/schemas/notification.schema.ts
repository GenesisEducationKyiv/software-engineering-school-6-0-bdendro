import * as z from 'zod';
import {
  emailSchema,
  nullableIsoDateTimeSchema,
  nullableTrimmedStringSchema,
  repoSchema,
  urlSchema,
} from '../../../../../libs/common/utils/validation/common.schema';

export const subscriptionCreatedEventSchema = z.strictObject({
  email: emailSchema,
  confirmationUrl: urlSchema,
  repo: repoSchema,
});

export type SubscriptionCreatedEvent = z.infer<typeof subscriptionCreatedEventSchema>;

export const subscriptionConfirmedEventSchema = z.strictObject({
  email: emailSchema,
  unsubscribeUrl: urlSchema,
  repo: repoSchema,
});

export type SubscriptionConfirmedEvent = z.infer<typeof subscriptionConfirmedEventSchema>;

export const unsubscribedEventSchema = z.strictObject({
  email: emailSchema,
  repo: repoSchema,
});

export type UnsubscribedEvent = z.infer<typeof unsubscribedEventSchema>;

export const repositoryReleaseSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  repoName: repoSchema,
  tagName: z.string().trim().min(1),
  name: nullableTrimmedStringSchema,
  htmlUrl: urlSchema,
  publishedAt: nullableIsoDateTimeSchema,
});

export type RepositoryRelease = z.infer<typeof repositoryReleaseSchema>;

export const subscriptionRepositoryReleasedEventSchema = z.strictObject({
  email: emailSchema,
  release: repositoryReleaseSchema,
  unsubscribeUrl: urlSchema,
});

export type SubscriptionRepositoryReleasedEvent = z.infer<
  typeof subscriptionRepositoryReleasedEventSchema
>;
