import type { ZodType } from 'zod';
import { ValidationErrorDetail } from '../errors/custom-errors';
import { mapValidationErrorDetails } from './map-validation-error-details';

type ValidationResult<T> =
  | { success: false; details: ValidationErrorDetail[] }
  | { success: true; data: T };

export function validate<T>(data: unknown, schema: ZodType<T>): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, success: true };
  return { details: mapValidationErrorDetails(result.error), success: false };
}
