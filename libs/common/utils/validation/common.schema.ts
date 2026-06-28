import * as z from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const urlSchema = z.string().trim().pipe(z.url());

export const repoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^/\s]+\/[^/\s]+$/, 'Repository must be in owner/repo format');

export const nullableTrimmedStringSchema = z.string().trim().nullable();

export const isoDateTimeSchema = z.string().trim().pipe(z.iso.datetime());
export const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();
