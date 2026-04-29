import { NextFunction, Request, Response } from 'express';
import { ExternalServiceError, HttpError, ValidationError } from '../utils/errors/custom-errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    if (err instanceof ExternalServiceError) {
      // TODO: add logger
      console.log(
        `[${err.serviceName}] ${err.cause instanceof Error ? `${err.cause.name}: ${err.cause.message}\n${err.cause.stack}` : ''}`,
      ); // warn
    } else if (err.statusCode >= 500) {
      console.log(
        `${err.name}(${err.statusCode}): ${err.message}\n${err.cause instanceof Error ? `${err.cause.name}: ${err.cause.message}\n${err.cause.stack}` : ''}`,
      ); // error
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

  let message: string;
  if (err instanceof Error) {
    message = `${err.name}: ${err.message}\n${err.stack}`;
  } else {
    message = `Unknown error: ${String(err)}`;
  }
  console.log(message); //error
  res.status(500).json({
    message: 'Internal Server Error',
  });
}
