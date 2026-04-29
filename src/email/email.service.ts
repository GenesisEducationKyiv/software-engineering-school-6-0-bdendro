import { GithubReleaseResponseInterface } from '../github/dto/github.response.dto';
import { EMAIL } from './constants/email.const';
import { EmailProviderInterface } from './interfaces/email.provider.interface';
import { EmailServiceInterface } from './interfaces/email.service.interface';
import { getConfirmEmailTemplate } from './templates/confirm-email.template';
import { getConfirmationSuccessTemplate } from './templates/confirmation-success.template';
import { getRepoUpdateTemplate } from './templates/repo-update.template';
import { getUnsubscribeSuccessTemplate } from './templates/unsubscribed.template';

export class EmailService implements EmailServiceInterface {
  constructor(private readonly emailProvider: EmailProviderInterface) {}

  async sendConfirmationEmail(to: string, token: string, repo: string): Promise<void> {
    const confirmationUrl = `${EMAIL.CONFIRMATION_BASE_URL}/${token}`;
    const html = getConfirmEmailTemplate(confirmationUrl, repo);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_CONFIRMATION, html });
  }

  async sendConfirmationSuccessEmail(to: string, token: string, repo: string): Promise<void> {
    const unsubscribeUrl = `${EMAIL.UNSUBSCRIBE_BASE_URL}/${token}`;
    const html = getConfirmationSuccessTemplate(unsubscribeUrl, repo);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_CONFIRMED, html });
  }

  async sendUnsubscribeSuccessEmail(to: string, repo: string): Promise<void> {
    const html = getUnsubscribeSuccessTemplate(repo);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_CANCELED, html });
  }

  async sendGitHubReleaseEmail(
    to: string,
    release: GithubReleaseResponseInterface,
    token: string,
  ): Promise<void> {
    const unsubscribeUrl = `${EMAIL.UNSUBSCRIBE_BASE_URL}/${token}`;
    const html = getRepoUpdateTemplate(release, unsubscribeUrl);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_REPO, html });
  }
}
