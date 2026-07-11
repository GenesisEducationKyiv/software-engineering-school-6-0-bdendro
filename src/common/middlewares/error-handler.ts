import { NextFunction, Request, Response } from 'express';
import { ExternalServiceError, HttpError, ValidationError } from '../utils/errors/custom-errors';
import { isRequestBodyParseError } from '../utils/errors/parse-body-error';
import { AppLogger } from '../modules/logger/interfaces/logger.interface';

export function createErrorHandler(logger: AppLogger) {
  return function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (!(err instanceof HttpError)) {
      if (isRequestBodyParseError(err)) {
        res.status(400).json({ message: 'Invalid body format' });
        return;
      }

      logger.error({ err }, 'Unknown error');
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }

    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message, details: err.details });
      return;
    }

    if (err instanceof ExternalServiceError) {
      logger.warn({ err }, 'External service error');
    } else if (err.statusCode >= 500) {
      logger.error({ err }, 'Internal error');
    }

    res.status(err.statusCode).json({ message: err.message });
    return;
  };
}
