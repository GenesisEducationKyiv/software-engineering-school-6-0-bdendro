import { EMAIL } from './constants/email.const';
import { EmailService } from './email.service';
import { EmailProviderInterface } from './interfaces/email.provider.interface';
import { getConfirmEmailTemplate } from './templates/confirm-email.template';
import { getConfirmationSuccessTemplate } from './templates/confirmation-success.template';
import { getRepoUpdateTemplate } from './templates/repo-update.template';
import { getUnsubscribeSuccessTemplate } from './templates/unsubscribed.template';

jest.mock('./templates/confirm-email.template', () => ({
  getConfirmEmailTemplate: jest.fn(),
}));

jest.mock('./templates/confirmation-success.template', () => ({
  getConfirmationSuccessTemplate: jest.fn(),
}));

jest.mock('./templates/repo-update.template', () => ({
  getRepoUpdateTemplate: jest.fn(),
}));

jest.mock('./templates/unsubscribed.template', () => ({
  getUnsubscribeSuccessTemplate: jest.fn(),
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let emailProvider: jest.Mocked<EmailProviderInterface>;

  const to = 'test@example.com';
  const token = 'test-token';
  const repo = 'owner/repo';

  const release = {
    repo,
    lastSeenTag: 'v1.2.3',
    htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.2.3',
    publishedAt: '2026-04-12T10:00:00.000Z',
  } as const;

  const confirmTemplateHtml = '<p>confirm-template</p>';
  const confirmationSuccessTemplateHtml = '<p>confirmation-success-template</p>';
  const unsubscribeSuccessTemplateHtml = '<p>unsubscribe-success-template</p>';
  const repoUpdateTemplateHtml = '<p>repo-update-template</p>';

  beforeAll(() => {
    emailProvider = {
      send: jest.fn(),
    } as any;

    emailService = new EmailService(emailProvider);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('sendConfirmationEmail', () => {
    const confirmationUrl = `${EMAIL.CONFIRMATION_BASE_URL}/${token}`;

    it('should build confirmation url, render confirmation template and send email', async () => {
      (
        getConfirmEmailTemplate as jest.MockedFunction<typeof getConfirmEmailTemplate>
      ).mockReturnValue(confirmTemplateHtml);

      await emailService.sendConfirmationEmail(to, token, repo);

      expect(getConfirmEmailTemplate).toHaveBeenCalledWith(confirmationUrl, repo);
      expect(emailProvider.send).toHaveBeenCalledWith({
        to,
        subject: EMAIL.SUBJECT_CONFIRMATION,
        html: confirmTemplateHtml,
      });
    });
  });

  describe('sendConfirmationSuccessEmail', () => {
    const unsubscribeUrl = `${EMAIL.UNSUBSCRIBE_BASE_URL}/${token}`;

    it('should build unsubscribe url, render confirmation success template and send email', async () => {
      (
        getConfirmationSuccessTemplate as jest.MockedFunction<typeof getConfirmationSuccessTemplate>
      ).mockReturnValue(confirmationSuccessTemplateHtml);

      await emailService.sendConfirmationSuccessEmail(to, token, repo);

      expect(getConfirmationSuccessTemplate).toHaveBeenCalledWith(unsubscribeUrl, repo);
      expect(emailProvider.send).toHaveBeenCalledWith({
        to,
        subject: EMAIL.SUBJECT_CONFIRMED,
        html: confirmationSuccessTemplateHtml,
      });
    });
  });

  describe('sendUnsubscribeSuccessEmail', () => {
    it('should render unsubscribe success template and send email', async () => {
      (
        getUnsubscribeSuccessTemplate as jest.MockedFunction<typeof getUnsubscribeSuccessTemplate>
      ).mockReturnValue(unsubscribeSuccessTemplateHtml);

      await emailService.sendUnsubscribeSuccessEmail(to, repo);

      expect(getUnsubscribeSuccessTemplate).toHaveBeenCalledWith(repo);
      expect(emailProvider.send).toHaveBeenCalledWith({
        to,
        subject: EMAIL.SUBJECT_CANCELED,
        html: unsubscribeSuccessTemplateHtml,
      });
    });
  });

  describe('sendGitHubReleaseEmail', () => {
    const unsubscribeUrl = `${EMAIL.UNSUBSCRIBE_BASE_URL}/${token}`;

    it('should build unsubscribe url, render repo update template and send email', async () => {
      (getRepoUpdateTemplate as jest.MockedFunction<typeof getRepoUpdateTemplate>).mockReturnValue(
        repoUpdateTemplateHtml,
      );

      await emailService.sendGitHubReleaseEmail(to, release, token);

      expect(getRepoUpdateTemplate).toHaveBeenCalledWith(release, unsubscribeUrl);
      expect(emailProvider.send).toHaveBeenCalledWith({
        to,
        subject: EMAIL.SUBJECT_REPO,
        html: repoUpdateTemplateHtml,
      });
    });
  });
});
