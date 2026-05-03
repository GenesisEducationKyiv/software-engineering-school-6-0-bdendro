import { NextFunction, Request, Response } from 'express';
import { ExternalServiceError, HttpError, ValidationError } from '../utils/errors/custom-errors';
import { AppLogger } from '../../config/logger';

export function createErrorHandler(logger: AppLogger) {
  return function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
      if (err instanceof ExternalServiceError) {
        logger.warn({ err }, 'External service error');
      } else if (err.statusCode >= 500) {
        logger.error({ err }, 'Internal error');
      }

      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ message: err.message, details: err.details });
        return;
      }
      res.status(err.statusCode).json({ message: err.message });
      return;
    }

    if (
      err instanceof SyntaxError &&
      'type' in err &&
      err.type === 'entity.parse.failed' &&
      'status' in err &&
      err.status === 400 &&
      'body' in err
    ) {
      res.status(400).json({ message: 'Invalid body' });
      return;
    }

    if (err instanceof Error) {
      logger.error({ err });
    } else {
      logger.error({ err }, 'Unknown error');
    }
    res.status(500).json({
      message: 'Internal Server Error',
    });
  };
}
