import * as z from 'zod';
import { SUBSCRIPTION_ROUTE_PATHS } from '../constants/subscriptions.const';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const subscribeBodySchema = z.strictObject({
  email: emailSchema,
  repo: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'Repository must be in owner/repo format'),
});

export type SubscribeBody = z.infer<typeof subscribeBodySchema>;

export const tokenParamsSchema = z.strictObject({
  [SUBSCRIPTION_ROUTE_PATHS.TOKEN]: z.string().trim().toLowerCase().pipe(z.uuid()),
});

export type TokenParams = z.infer<typeof tokenParamsSchema>;

export const subscriptionsQuerySchema = z.strictObject({
  email: emailSchema,
});

export type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema>;
