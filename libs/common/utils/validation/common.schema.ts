import * as z from 'zod';

export const numericIdSchema = z.coerce.number().int().positive();

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const urlSchema = z.string().trim().pipe(z.url());

export const repoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^/\s]+\/[^/\s]+$/, 'Repository must be in owner/repo format');

export const trimmedStringSchema = z.string().trim();
export const nullableTrimmedStringSchema = trimmedStringSchema.nullable();

export const isoDateTimeSchema = z.string().trim().pipe(z.iso.datetime());
export const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();
