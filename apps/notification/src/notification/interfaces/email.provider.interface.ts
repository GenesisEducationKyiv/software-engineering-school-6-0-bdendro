import { EmailVerificationKind } from '../constants/email-provider';

export type EmailProviderVerificationResult =
  | { ok: true }
  | {
      ok: false;
      kind: EmailVerificationKind;
      error: unknown;
    };

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailProviderInterface {
  verifyTransporter(): Promise<EmailProviderVerificationResult>;
  send(options: SendEmailOptions): Promise<void>;
  closeConnection(): void;
}
