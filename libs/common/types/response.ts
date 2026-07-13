import { ValidationErrorDetail } from '../utils/errors/custom-errors';

export interface MessageResponse {
  message: string;
}

export interface ValidationErrorResponse extends MessageResponse {
  details: ValidationErrorDetail[];
}
