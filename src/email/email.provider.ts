import { Transporter, createTransport } from 'nodemailer';
import {
  EmailProviderInterface,
  EmailProviderVerificationResult,
  SendEmailOptions,
} from './interfaces/email.provider.interface';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  EMAIL_ERROR_AUTH_CODES,
  EMAIL_ERROR_CONNECTION_CODES,
  EMAIL_VERIFICATION_ERROR_KIND,
} from './constants/email-provider';
import { isNodemailerErrorLike } from './utils/error';
import { EmailServiceError } from '../common/utils/errors/custom-errors';

interface EmailProviderOptions {
  EMAIL: string;
  EMAIL_PASSWORD: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;

  APP_NAME: string;
}

export class EmailProvider implements EmailProviderInterface {
  private readonly transporter: Transporter;

  constructor(options: EmailProviderOptions) {
    const transportOptions: SMTPTransport.Options = {
      host: options.EMAIL_HOST,
      port: options.EMAIL_PORT,
      secure: options.EMAIL_SECURE,
      auth: {
        user: options.EMAIL,
        pass: options.EMAIL_PASSWORD,
      },
    };

    this.transporter = createTransport(transportOptions, {
      from: `"${options.APP_NAME}" <${options.EMAIL}>`,
    });
  }

  async verifyTransporter(): Promise<EmailProviderVerificationResult> {
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (error) {
      const code = isNodemailerErrorLike(error) ? error.code : undefined;

      if (EMAIL_ERROR_AUTH_CODES.includes(code || '')) {
        return { ok: false, kind: EMAIL_VERIFICATION_ERROR_KIND.AUTH, error };
      }

      if (EMAIL_ERROR_CONNECTION_CODES.includes(code || '')) {
        return { ok: false, kind: EMAIL_VERIFICATION_ERROR_KIND.CONNECTION, error };
      }

      return { ok: false, kind: EMAIL_VERIFICATION_ERROR_KIND.UNKNOWN, error };
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (err) {
      if (isNodemailerErrorLike(err)) {
        throw new EmailServiceError(new Error(`${err.code} nodemailer error`, { cause: err }));
      }
      throw new EmailServiceError(new Error(`Nodemailer unknown error`, { cause: err }));
    }
  }

  closeConnection(): void {
    this.transporter.close();
  }
}
