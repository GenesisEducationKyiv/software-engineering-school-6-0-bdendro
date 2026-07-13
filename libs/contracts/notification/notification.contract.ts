import * as z from 'zod';
import {
  emailSchema,
  nullableIsoDateTimeSchema,
  nullableTrimmedStringSchema,
  repoSchema,
  urlSchema,
} from '../../common/utils/validation/common.schema';
import { MessageResponse, ValidationErrorResponse } from '../../common/types/response';

// Response
export type { MessageResponse };

export type { ValidationErrorResponse };

export type ServiceUnavailableResponse = MessageResponse & { serviceName: string };

// POST /subscription-confirmation
// - 200: ResponseMessage
// - 400: ResponseMessage | ValidationErrorResponse
// - 503: ResponseMessage | ServiceUnavailableResponse
export const sendConfirmationBodySchema = z.strictObject({
  to: emailSchema,
  confirmationUrl: urlSchema,
  repo: repoSchema,
});

export type SendConfirmationBody = z.infer<typeof sendConfirmationBodySchema>;

// POST /subscription-confirmation-success
// - 200: ResponseMessage
// - 400: ResponseMessage | ValidationErrorResponse
// - 503: ResponseMessage | ServiceUnavailableResponse
export const sendConfirmationSuccessBodySchema = z.strictObject({
  to: emailSchema,
  unsubscribeUrl: urlSchema,
  repo: repoSchema,
});

export type SendConfirmationSuccessBody = z.infer<typeof sendConfirmationSuccessBodySchema>;

// POST /subscription-unsubscribe-success
// - 200: ResponseMessage
// - 400: ResponseMessage | ValidationErrorResponse
// - 503: ResponseMessage | ServiceUnavailableResponse
export const sendUnsubscribeSuccessBodySchema = z.strictObject({
  to: emailSchema,
  repo: repoSchema,
});

export type SendUnsubscribeSuccessBody = z.infer<typeof sendUnsubscribeSuccessBodySchema>;

// POST /repository-release
// 200: ResponseMessage
// 400: ResponseMessage | ValidationErrorResponse
// 503: ResponseMessage | ServiceUnavailableResponse
export const repositoryReleaseSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  repoName: repoSchema,
  tagName: z.string().trim().min(1),
  name: nullableTrimmedStringSchema,
  htmlUrl: urlSchema,
  publishedAt: nullableIsoDateTimeSchema,
});

export type RepositoryRelease = z.infer<typeof repositoryReleaseSchema>;

export const sendRepositoryReleaseBodySchema = z.strictObject({
  to: emailSchema,
  release: repositoryReleaseSchema,
  unsubscribeUrl: urlSchema,
});

export type SendRepositoryReleaseBody = z.infer<typeof sendRepositoryReleaseBodySchema>;
