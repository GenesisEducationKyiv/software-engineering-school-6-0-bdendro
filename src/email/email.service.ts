import { GithubReleaseResponseInterface } from '../github/dto/github.response.dto';
import { EMAIL } from './constants/email.const';
import { EmailProviderInterface } from './interfaces/email.provider.interface';
import { GithubReleaseEmailServiceInterface } from './interfaces/github-release-email.service.interface';
import { SubscriptionEmailServiceInterface } from './interfaces/subscription-email.service.interface';
import { getConfirmEmailTemplate } from './templates/confirm-email.template';
import { getConfirmationSuccessTemplate } from './templates/confirmation-success.template';
import { getRepoUpdateTemplate } from './templates/repo-update.template';
import { getUnsubscribeSuccessTemplate } from './templates/unsubscribed.template';

export class EmailService
  implements SubscriptionEmailServiceInterface, GithubReleaseEmailServiceInterface
{
  constructor(
    private readonly emailProvider: EmailProviderInterface,
    private readonly appBaseUrl: string,
  ) {}

  async sendConfirmationEmail(to: string, token: string, repo: string): Promise<void> {
    const confirmationUrl = `${this.appBaseUrl}/${EMAIL.CONFIRMATION_PATH}/${token}`;
    const html = getConfirmEmailTemplate(confirmationUrl, repo);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_CONFIRMATION, html });
  }

  async sendConfirmationSuccessEmail(to: string, token: string, repo: string): Promise<void> {
    const unsubscribeUrl = `${this.appBaseUrl}/${EMAIL.UNSUBSCRIBE_PATH}/${token}`;
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
    const unsubscribeUrl = `${this.appBaseUrl}/${EMAIL.UNSUBSCRIBE_PATH}/${token}`;
    const html = getRepoUpdateTemplate(release, unsubscribeUrl);
    await this.emailProvider.send({ to, subject: EMAIL.SUBJECT_REPO, html });
  }
}
