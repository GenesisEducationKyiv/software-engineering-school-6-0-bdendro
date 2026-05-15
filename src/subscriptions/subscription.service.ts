import { randomUUID } from 'node:crypto';
import { SubscriptionResponseDTO } from './dto/subscription.response.dto';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionServiceInterface } from './interfaces/subscription.service.interface';
import { SubscribeBody } from './schemas/subscription.schema';
import { NotFoundError } from '../common/utils/errors/custom-errors';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { EmailServiceInterface } from '../email/interfaces/email.service.interface';
import { GithubServiceInterface } from '../github/interfaces/github.service.interface';
import { GITHUB_ERROR_MESSAGES } from '../github/constants/error-messages';
import { Subscription } from '../generated/prisma/client';
import ms from 'ms';

export class SubscriptionService implements SubscriptionServiceInterface {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepositoryInterface,
    private readonly emailService: EmailServiceInterface,
    private readonly githubService: GithubServiceInterface,
  ) {}

  async getAll(): Promise<Subscription[]> {
    return await this.subscriptionRepository.getAll();
  }

  async deleteUnconfirmed(expirationTime: string): Promise<number> {
    const expirationTimeInMs = ms(expirationTime as ms.StringValue);
    return await this.subscriptionRepository.deleteUnconfirmed(expirationTimeInMs);
  }

  async updateLastSeenTagByToken(
    token: string,
    lastSeenTag: string,
  ): Promise<SubscriptionResponseDTO> {
    const subscription = await this.subscriptionRepository.updateByToken(token, { lastSeenTag });
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    return {
      email: subscription.email,
      repo: subscription.repo,
      confirmed: subscription.confirmed,
      last_seen_tag: subscription.lastSeenTag,
    };
  }

  async subscribe(subscribeBody: SubscribeBody): Promise<void> {
    const isRepoExists = await this.githubService.isRepositoryExists(subscribeBody.repo);
    if (!isRepoExists) throw new NotFoundError(GITHUB_ERROR_MESSAGES.REPO_NOT_FOUND);

    const release = await this.githubService.getLastRelease(subscribeBody.repo);

    const token = randomUUID();
    await this.subscriptionRepository.create(
      { ...subscribeBody, lastSeenTag: release?.lastSeenTag || null },
      token,
    );

    await this.emailService.sendConfirmationEmail(subscribeBody.email, token, subscribeBody.repo);
  }

  async confirm(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.updateByToken(token, {
      confirmed: true,
    });
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    await this.emailService.sendConfirmationSuccessEmail(
      subscription.email,
      token,
      subscription.repo,
    );

    return;
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.deleteByToken(token);
    if (!subscription) throw new NotFoundError(SUBSCRIPTION_ERROR_MESSAGES.NOT_FOUND);

    await this.emailService.sendUnsubscribeSuccessEmail(subscription.email, subscription.repo);

    return;
  }

  async getSubscriptionsByEmail(email: string): Promise<SubscriptionResponseDTO[]> {
    const subscriptions = await this.subscriptionRepository.getSubscriptionsByEmail(email);
    return subscriptions.map((sub) => ({
      email: sub.email,
      repo: sub.repo,
      confirmed: sub.confirmed,
      last_seen_tag: sub.lastSeenTag,
    }));
  }
}
