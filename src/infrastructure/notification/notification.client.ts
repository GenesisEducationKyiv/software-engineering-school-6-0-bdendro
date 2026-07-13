import axios, { type AxiosInstance } from 'axios';
import { GithubRelease } from '../../modules/github';
import { RepositoryReleaseNotificationSenderInterface } from './interfaces/repository-release-email.sender.interface';
import { SubscriptionNotificationSenderInterface } from './interfaces/subscription-email.service.interface';
import { NotificationClientMapper } from './notification.mapper';
import {
  MessageResponse,
  SendConfirmationBody,
  SendConfirmationSuccessBody,
  SendRepositoryReleaseBody,
  SendUnsubscribeSuccessBody,
  ServiceUnavailableResponse,
  ValidationErrorResponse,
} from '../../../libs/contracts/notification/notification.contract';
import { NOTIFICATION_ROUTE_PATHS } from '../../../libs/contracts/notification/notification.const';
import { EmailServiceError } from '../../../libs/common/utils/errors/custom-errors';

interface Options {
  NOTIFICATION_SERVICE_URL: string;
}

type NotificationErrorResponse = ValidationErrorResponse | ServiceUnavailableResponse;

export class NotificationClient
  implements SubscriptionNotificationSenderInterface, RepositoryReleaseNotificationSenderInterface
{
  private readonly client: AxiosInstance;

  constructor(
    options: Options,
    private readonly mapper: NotificationClientMapper,
  ) {
    this.client = axios.create({ timeout: 5_000, baseURL: options.NOTIFICATION_SERVICE_URL });
  }

  async sendConfirmationNotification(
    to: string,
    confirmationUrl: string,
    repo: string,
  ): Promise<void> {
    const body: SendConfirmationBody = { to, confirmationUrl, repo };
    try {
      await this.client.post<MessageResponse>(NOTIFICATION_ROUTE_PATHS.CONFIRMATION, body);
    } catch (err) {
      this.handleNotificationError(err);
    }
  }

  async sendConfirmationSuccessNotification(
    to: string,
    unsubscribeUrl: string,
    repo: string,
  ): Promise<void> {
    const body: SendConfirmationSuccessBody = { to, unsubscribeUrl, repo };
    try {
      await this.client.post<MessageResponse>(NOTIFICATION_ROUTE_PATHS.CONFIRMATION_SUCCESS, body);
    } catch (err) {
      this.handleNotificationError(err);
    }
  }

  async sendUnsubscribeSuccessNotification(to: string, repo: string): Promise<void> {
    const body: SendUnsubscribeSuccessBody = { to, repo };
    try {
      await this.client.post<MessageResponse>(NOTIFICATION_ROUTE_PATHS.UNSUBSCRIBE_SUCCESS, body);
    } catch (err) {
      this.handleNotificationError(err);
    }
  }

  async sendRepositoryReleaseNotification(
    to: string,
    release: GithubRelease,
    unsubscribeUrl: string,
  ): Promise<void> {
    const body: SendRepositoryReleaseBody = {
      to,
      unsubscribeUrl,
      release: this.mapper.toRepositoryRelease(release),
    };
    try {
      await this.client.post<MessageResponse>(NOTIFICATION_ROUTE_PATHS.REPOSITORY_RELEASE, body);
    } catch (err) {
      this.handleNotificationError(err);
    }
  }

  private handleNotificationError(err: unknown) {
    if (!axios.isAxiosError<NotificationErrorResponse>(err)) {
      throw err;
    }

    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 503 && this.hasServiceName(data)) {
      throw new EmailServiceError(err);
    }
    throw err;
  }

  private hasServiceName(data: unknown): data is { serviceName: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'serviceName' in data &&
      typeof data.serviceName === 'string'
    );
  }
}
