import { ValidationErrorDetail } from '../utils/errors/custom-errors';

export interface MessageResponse {
  message: string;
}

export type PendingResponse = MessageResponse & { operationId: string };

export interface ValidationErrorResponse extends MessageResponse {
  details: ValidationErrorDetail[];
}
