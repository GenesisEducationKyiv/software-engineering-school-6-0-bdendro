import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, ValidationErrorDetail } from '../utils/errors/custom-errors';
import { ValidatedRequest } from '../types/validated-request';

const requestParts = ['body', 'params', 'query'] as const;

type RequestPart = (typeof requestParts)[number];

type RequestSchemas = Partial<Record<RequestPart, ZodType>>;

type ValidatedRequestPart = ValidatedRequest['validated'];

export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: ValidationErrorDetail[] = [];
    const validated: ValidatedRequestPart = {};

    for (const part of requestParts) {
      const schema = schemas[part];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part] || {});

      if (!result.success) {
        details.push(
          ...result.error.issues.map((issue) => {
            return { path: issue.path.map((pathEl) => pathEl.toString()), message: issue.message };
          }),
        );

        continue;
      }

      // TODO: fix types
      (validated[part] as any) = result.data;
    }

    if (details.length > 0) {
      next(new ValidationError(details));
      return;
    }

    (req as ValidatedRequest).validated = validated;
    next();
  };
}
