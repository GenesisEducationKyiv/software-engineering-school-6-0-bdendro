import { ZodError } from 'zod';
import { ValidationErrorDetail } from '../errors/custom-errors';

export function mapValidationErrorDetails(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => {
    return { path: issue.path.map((pathEl) => pathEl.toString()), message: issue.message };
  });
}
