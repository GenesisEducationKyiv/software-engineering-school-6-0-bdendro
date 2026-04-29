import type { Subscription } from '../generated/prisma/client';
import { NotFoundError } from '../common/utils/errors/custom-errors';
import { EmailServiceInterface } from '../email/interfaces/email.service.interface';
import { GITHUB_ERROR_MESSAGES } from '../github/constants/error-messages';
import { GithubServiceInterface } from '../github/interfaces/github.service.interface';
import { SUBSCRIPTION_ERROR_MESSAGES } from './constants/error-messages';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let subscriptionRepository: jest.Mocked<SubscriptionRepositoryInterface>;
  let emailService: jest.Mocked<EmailServiceInterface>;
  let githubService: jest.Mocked<GithubServiceInterface>;

  const email = 'test@example.com';
  const repo = 'owner/repo';
  const token = 'test-token';

  const subscribeBody = {
    email,
    repo,
  } as const;

  const release = {
    repo,
    lastSeenTag: 'v1.2.3',
    htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.2.3',
    publishedAt: '2026-04-12T10:00:00.000Z',
  } as const;

  const createSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
    ({
      id: 1,
      email,
      repo,
      token,
      confirmed: false,
      lastSeenTag: 'v1.0.0',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    }) as Subscription;

  beforeAll(() => {
    subscriptionRepository = {
      getAll: jest.fn(),
      deleteUnconfirmed: jest.fn(),
      updateByToken: jest.fn(),
      create: jest.fn(),
      deleteByToken: jest.fn(),
      getSubscriptionsByEmail: jest.fn(),
      getSubscriptionByToken: jest.fn(),
    };

    emailService = {
      sendConfirmationEmail: jest.fn(),
      sendConfirmationSuccessEmail: jest.fn(),
      sendUnsubscribeSuccessEmail: jest.fn(),
      sendGitHubReleaseEmail: jest.fn(),
    } as jest.Mocked<EmailServiceInterface>;

    githubService = {
      isRepositoryExists: jest.fn(),
      getLastRelease: jest.fn(),
    } as jest.Mocked<GithubServiceInterface>;

    subscriptionService = new SubscriptionService(
      subscriptionRepository,
      emailService,
      githubService,
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getAll', () => {
    const subscriptions = [
      createSubscription(),
      createSubscription({
        id: 2,
        email: 'second@example.com',
        repo: 'owner/second-repo',
      }),
    ];

    it('should return all subscriptions', async () => {
      subscriptionRepository.getAll.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getAll();

      expect(result).toEqual(subscriptions);
    });
  });

  describe('deleteUnconfirmed', () => {
    it('should convert expiration time to milliseconds and pass it to repository', async () => {
      subscriptionRepository.deleteUnconfirmed.mockResolvedValue(3);

      const result = await subscriptionService.deleteUnconfirmed('10m');

      expect(subscriptionRepository.deleteUnconfirmed).toHaveBeenCalledWith(600000);
      expect(result).toBe(3);
    });
  });

  describe('updateLastSeenTagByToken', () => {
    const updatedSubscription = createSubscription({
      confirmed: true,
      lastSeenTag: 'v2.0.0',
    });

    it('should update last seen tag and return response dto', async () => {
      subscriptionRepository.updateByToken.mockResolvedValue(updatedSubscription);

      const result = await subscriptionService.updateLastSeenTagByToken(token, 'v2.0.0');

      expect(subscriptionRepository.updateByToken).toHaveBeenCalledWith(token, {
        lastSeenTag: 'v2.0.0',
      });
      expect(result).toEqual({
        email: updatedSubscription.email,
        repo: updatedSubscription.repo,
        confirmed: updatedSubscription.confirmed,
        last_seen_tag: updatedSubscription.lastSeenTag,
      });
    });

    it('should throw NotFoundError when subscription is not found', async () => {
      subscriptionRepository.updateByToken.mockResolvedValue(null);

      await expect(subscriptionService.updateLastSeenTagByToken(token, 'v2.0.0')).rejects.toThrow(
        NotFoundError,
      );

      expect(subscriptionRepository.updateByToken).toHaveBeenCalledWith(token, {
        lastSeenTag: 'v2.0.0',
      });
    });
  });

  describe('subscribe', () => {
    it('should create subscription with release tag and send confirmation email', async () => {
      githubService.isRepositoryExists.mockResolvedValue(true);
      githubService.getLastRelease.mockResolvedValue(release);

      await subscriptionService.subscribe(subscribeBody);

      expect(githubService.isRepositoryExists).toHaveBeenCalledWith(repo);
      expect(githubService.getLastRelease).toHaveBeenCalledWith(repo);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        {
          ...subscribeBody,
          lastSeenTag: release.lastSeenTag,
        },
        expect.any(String),
      );

      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        repo,
      );

      const createdToken = subscriptionRepository.create.mock.calls[0][1];
      const emailedToken = emailService.sendConfirmationEmail.mock.calls[0][1];

      expect(typeof createdToken).toBe('string');
      expect(createdToken.length).toBeGreaterThan(0);
      expect(emailedToken).toBe(createdToken);
    });

    it('should throw NotFoundError when repository does not exist', async () => {
      githubService.isRepositoryExists.mockResolvedValue(false);

      await expect(subscriptionService.subscribe(subscribeBody)).rejects.toThrow(NotFoundError);

      expect(githubService.isRepositoryExists).toHaveBeenCalledWith(repo);
      expect(githubService.getLastRelease).not.toHaveBeenCalled();
      expect(subscriptionRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should create subscription with null lastSeenTag when release does not exist', async () => {
      githubService.isRepositoryExists.mockResolvedValue(true);
      githubService.getLastRelease.mockResolvedValue(null);

      await subscriptionService.subscribe(subscribeBody);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        {
          ...subscribeBody,
          lastSeenTag: null,
        },
        expect.any(String),
      );

      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        repo,
      );

      const createdToken = subscriptionRepository.create.mock.calls[0][1];
      const emailedToken = emailService.sendConfirmationEmail.mock.calls[0][1];

      expect(typeof createdToken).toBe('string');
      expect(createdToken.length).toBeGreaterThan(0);
      expect(emailedToken).toBe(createdToken);
    });
  });

  describe('confirm', () => {
    it('should confirm subscription and send confirmation success email', async () => {
      const confirmedSubscription = createSubscription({
        confirmed: true,
      });

      subscriptionRepository.updateByToken.mockResolvedValue(confirmedSubscription);

      await subscriptionService.confirm(token);

      expect(subscriptionRepository.updateByToken).toHaveBeenCalledWith(token, {
        confirmed: true,
      });
      expect(emailService.sendConfirmationSuccessEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendConfirmationSuccessEmail).toHaveBeenCalledWith(
        confirmedSubscription.email,
        token,
        confirmedSubscription.repo,
      );
    });

    it('should throw NotFoundError when subscription to confirm is not found', async () => {
      subscriptionRepository.updateByToken.mockResolvedValue(null);

      await expect(subscriptionService.confirm(token)).rejects.toThrow(NotFoundError);
      expect(emailService.sendConfirmationSuccessEmail).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should delete subscription and send unsubscribe success email', async () => {
      const deletedSubscription = createSubscription();

      subscriptionRepository.deleteByToken.mockResolvedValue(deletedSubscription);

      await subscriptionService.unsubscribe(token);

      expect(subscriptionRepository.deleteByToken).toHaveBeenCalledWith(token);
      expect(emailService.sendUnsubscribeSuccessEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendUnsubscribeSuccessEmail).toHaveBeenCalledWith(
        deletedSubscription.email,
        deletedSubscription.repo,
      );
    });

    it('should throw NotFoundError when subscription to unsubscribe is not found', async () => {
      subscriptionRepository.deleteByToken.mockResolvedValue(null);

      await expect(subscriptionService.unsubscribe(token)).rejects.toThrow(NotFoundError);
      expect(emailService.sendUnsubscribeSuccessEmail).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriptionsByEmail', () => {
    it('should return subscriptions mapped to response DTOs', async () => {
      const subscriptions = [
        createSubscription({
          id: 1,
          confirmed: true,
          lastSeenTag: 'v1.0.0',
        }),
        createSubscription({
          id: 2,
          repo: 'owner/second-repo',
          confirmed: false,
          lastSeenTag: null,
        }),
      ];

      const expected = [
        {
          email,
          repo,
          confirmed: true,
          last_seen_tag: 'v1.0.0',
        },
        {
          email,
          repo: 'owner/second-repo',
          confirmed: false,
          last_seen_tag: null,
        },
      ];

      subscriptionRepository.getSubscriptionsByEmail.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getSubscriptionsByEmail(email);

      expect(subscriptionRepository.getSubscriptionsByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(expected);
    });
  });
});
