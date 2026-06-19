import { Response } from 'express';
import { RequestWithValidatedBody } from '../../../../libs/common/types/validated-request';
import {
  MessageResponse,
  SendConfirmationBody,
  SendConfirmationSuccessBody,
  SendRepositoryReleaseBody,
  SendUnsubscribeSuccessBody,
} from '../../../../libs/contracts/notification/notification.schema';
import { EmailServiceInterface } from './interfaces/email.service.interface';

export class EmailController {
  constructor(private readonly emailService: EmailServiceInterface) {}
  async sendConfirmationEmail(
    req: RequestWithValidatedBody<SendConfirmationBody>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    const { to, confirmationUrl, repo } = req.validated.body;
    await this.emailService.sendConfirmationEmail(to, confirmationUrl, repo);
    res.status(200).json({ message: 'Confirmation email sent.' });
  }

  async sendConfirmationSuccessEmail(
    req: RequestWithValidatedBody<SendConfirmationSuccessBody>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    const { to, unsubscribeUrl, repo } = req.validated.body;
    await this.emailService.sendConfirmationSuccessEmail(to, unsubscribeUrl, repo);
    res.status(200).json({ message: 'Confirmation success email sent.' });
  }

  async sendUnsubscribeSuccessEmail(
    req: RequestWithValidatedBody<SendUnsubscribeSuccessBody>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    const { to, repo } = req.validated.body;
    await this.emailService.sendUnsubscribeSuccessEmail(to, repo);
    res.status(200).json({ message: 'Unsubscribe success email sent.' });
  }

  async sendGitHubReleaseEmail(
    req: RequestWithValidatedBody<SendRepositoryReleaseBody>,
    res: Response<MessageResponse>,
  ): Promise<void> {
    const { to, release, unsubscribeUrl } = req.validated.body;
    await this.emailService.sendGitHubReleaseEmail(to, release, unsubscribeUrl);
    res.status(200).json({ message: 'Repository release email sent.' });
  }
}
