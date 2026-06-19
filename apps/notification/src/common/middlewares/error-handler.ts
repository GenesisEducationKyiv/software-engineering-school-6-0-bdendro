import { NextFunction, Request, Response } from 'express';
import { AppLogger } from '../../../../../libs/infrastructure/logger/interfaces/logger.interface';
import {
  ExternalServiceError,
  HttpError,
  ValidationError,
} from '../../../../../libs/common/utils/errors/custom-errors';
import { isRequestBodyParseError } from '../../../../../libs/common/utils/errors/parse-body-error';
import {
  MessageResponse,
  ServiceUnavailableResponse,
  ValidationErrorResponse,
} from '../../../../../libs/contracts/notification/notification.contract';

type ErrorResponse = MessageResponse | ValidationErrorResponse | ServiceUnavailableResponse;

export function createErrorHandler(logger: AppLogger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response<ErrorResponse>,
    _next: NextFunction,
  ) {
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
      res.status(503).json({ message: err.message, serviceName: err.serviceName });
      logger.warn({ err }, 'External service error');
    } else if (err.statusCode >= 500) {
      logger.error({ err }, 'Internal error');
    }

    res.status(err.statusCode).json({ message: err.message });
    return;
  };
}
