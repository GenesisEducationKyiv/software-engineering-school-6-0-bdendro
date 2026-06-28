import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import type {
  GithubServiceInterface,
  GithubRelease,
} from '../../../apps/tracker/src/modules/github/index';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionService } from './subscription.service';
import { SubscribeBody } from './schemas/subscription.schema';
import { Subscription } from './types/subscription';
import { SubscriptionEventProducerInterface } from './interfaces/subscription-event.producer';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let subscriptionRepository: jest.Mocked<SubscriptionRepositoryInterface>;
  let subscriptionEventProducer: jest.Mocked<SubscriptionEventProducerInterface>;
  let githubService: jest.Mocked<GithubServiceInterface>;

  const email = 'test@example.com';
  const repo = 'owner/repo';
  const token = 'test-token';
  const baseSubscriptionUrl = 'http://localhost:3000/api';

  const subscribeBody: SubscribeBody = {
    email,
    repo,
  };

  const release: GithubRelease = {
    id: 1,
    repoName: repo,
    name: 'name',
    tagName: 'v1.2.3',
    htmlUrl: 'https://github.com/owner/repo/releases/tag/v1.2.3',
    publishedAt: '2026-04-12T10:00:00.000Z',
  };

  const createSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: 1,
    email,
    repo,
    token,
    confirmed: false,
    lastSeenTag: 'v1.0.0',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeAll(() => {
    subscriptionRepository = {
      getConfirmedSubscriptions: jest.fn(),
      deleteUnconfirmed: jest.fn(),
      updateByToken: jest.fn(),
      create: jest.fn(),
      deleteByToken: jest.fn(),
      getSubscriptionsByEmail: jest.fn(),
      getSubscriptionByToken: jest.fn(),
    };

    subscriptionEventProducer = {
      produceSubscriptionConfirmed: jest.fn(),
      produceSubscriptionCreated: jest.fn(),
      produceSubscriptionUnsubscribed: jest.fn(),
    } as jest.Mocked<SubscriptionEventProducerInterface>;

    githubService = {
      ensureRepositoryExists: jest.fn(),
      getLastRelease: jest.fn(),
    } as jest.Mocked<GithubServiceInterface>;

    subscriptionService = new SubscriptionService(
      subscriptionRepository,
      subscriptionEventProducer,
      githubService,
      baseSubscriptionUrl,
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getConfirmedSubscriptions', () => {
    const subscriptions = [
      createSubscription(),
      createSubscription({
        id: 2,
        email: 'second@example.com',
        repo: 'owner/second-repo',
      }),
    ];

    it('should return all confirmed subscriptions', async () => {
      subscriptionRepository.getConfirmedSubscriptions.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getConfirmedSubscriptions();

      expect(result).toEqual(subscriptions);
    });
  });

  describe('deleteUnconfirmed', () => {
    const expirationTimeInMs = 600_000;

    it('should delete unconfirmed subscriptions', async () => {
      subscriptionRepository.deleteUnconfirmed.mockResolvedValue(3);

      const result = await subscriptionService.deleteUnconfirmed(expirationTimeInMs);

      expect(subscriptionRepository.deleteUnconfirmed).toHaveBeenCalledWith(expirationTimeInMs);
      expect(result).toBe(3);
    });
  });

  describe('updateLastSeenTagByToken', () => {
    const updatedSubscription = createSubscription({
      confirmed: true,
      lastSeenTag: 'v2.0.0',
    });

    it('should update last seen tag and return subscription', async () => {
      subscriptionRepository.updateByToken.mockResolvedValue(updatedSubscription);
      const lastSeenTag = 'v2.0.0';

      const result = await subscriptionService.updateLastSeenTagByToken(token, lastSeenTag);

      expect(subscriptionRepository.updateByToken).toHaveBeenCalledWith(token, {
        lastSeenTag,
      });
      expect(result).toEqual({
        ...updatedSubscription,
        token,
        lastSeenTag,
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
      githubService.ensureRepositoryExists.mockResolvedValue(true);
      githubService.getLastRelease.mockResolvedValue(release);

      await subscriptionService.subscribe(subscribeBody);

      expect(githubService.ensureRepositoryExists).toHaveBeenCalledWith(repo);
      expect(githubService.getLastRelease).toHaveBeenCalledWith(repo);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        {
          ...subscribeBody,
          lastSeenTag: release.tagName,
        },
        expect.any(String),
      );

      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledWith(
        email,
        expect.any(String),
        repo,
      );

      const createdToken = subscriptionRepository.create.mock.calls[0][1];
      const emailedToken = subscriptionEventProducer.produceSubscriptionCreated.mock.calls[0][1];

      expect(typeof createdToken).toBe('string');
      expect(createdToken.length).toBeGreaterThan(0);
      expect(emailedToken).toContain(createdToken);
    });

    it('should throw NotFoundError when repository does not exist', async () => {
      githubService.ensureRepositoryExists.mockResolvedValue(false);

      await expect(subscriptionService.subscribe(subscribeBody)).rejects.toThrow(NotFoundError);

      expect(githubService.ensureRepositoryExists).toHaveBeenCalledWith(repo);
      expect(githubService.getLastRelease).not.toHaveBeenCalled();
      expect(subscriptionRepository.create).not.toHaveBeenCalled();
      expect(subscriptionEventProducer.produceSubscriptionCreated).not.toHaveBeenCalled();
    });

    it('should create subscription with null lastSeenTag when release does not exist', async () => {
      githubService.ensureRepositoryExists.mockResolvedValue(true);
      githubService.getLastRelease.mockResolvedValue(null);

      await subscriptionService.subscribe(subscribeBody);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        {
          ...subscribeBody,
          lastSeenTag: null,
        },
        expect.any(String),
      );

      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledWith(
        email,
        expect.any(String),
        repo,
      );

      const createdToken = subscriptionRepository.create.mock.calls[0][1];
      const emailedToken = subscriptionEventProducer.produceSubscriptionCreated.mock.calls[0][1];

      expect(typeof createdToken).toBe('string');
      expect(createdToken.length).toBeGreaterThan(0);
      expect(emailedToken).toContain(createdToken);
    });
  });

  describe('confirm', () => {
    it('should confirm subscription and send confirmation success email', async () => {
      const unconfirmedSubscription = createSubscription();
      const confirmedSubscription: Subscription = { ...unconfirmedSubscription, confirmed: true };

      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(unconfirmedSubscription);
      subscriptionRepository.updateByToken.mockResolvedValue(confirmedSubscription);

      await subscriptionService.confirm(token);

      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledWith(token);
      expect(subscriptionRepository.updateByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.updateByToken).toHaveBeenCalledWith(token, {
        confirmed: true,
      });
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).toHaveBeenCalledWith(
        confirmedSubscription.email,
        expect.stringContaining(token),
        confirmedSubscription.repo,
      );
    });

    it('should not update subscription or send email if subscription is already confirmed', async () => {
      const confirmedSubscription = createSubscription({ confirmed: true });

      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(confirmedSubscription);

      await subscriptionService.confirm(token);

      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledWith(
        expect.stringContaining(token),
      );
      expect(subscriptionRepository.updateByToken).not.toHaveBeenCalled();
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when subscription to confirm is not found', async () => {
      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(null);

      await expect(subscriptionService.confirm(token)).rejects.toThrow(NotFoundError);
      expect(subscriptionRepository.updateByToken).not.toHaveBeenCalled();
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should delete subscription and send unsubscribe success email', async () => {
      const deletedSubscription = createSubscription();

      subscriptionRepository.deleteByToken.mockResolvedValue(deletedSubscription);

      await subscriptionService.unsubscribe(token);

      expect(subscriptionRepository.deleteByToken).toHaveBeenCalledWith(token);
      expect(subscriptionEventProducer.produceSubscriptionUnsubscribed).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionUnsubscribed).toHaveBeenCalledWith(
        deletedSubscription.email,
        deletedSubscription.repo,
      );
    });

    it('should throw NotFoundError when subscription to unsubscribe is not found', async () => {
      subscriptionRepository.deleteByToken.mockResolvedValue(null);

      await expect(subscriptionService.unsubscribe(token)).rejects.toThrow(NotFoundError);
      expect(subscriptionEventProducer.produceSubscriptionUnsubscribed).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriptionsByEmail', () => {
    it('should return subscriptions', async () => {
      const subscriptions: Subscription[] = [
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

      subscriptionRepository.getSubscriptionsByEmail.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getSubscriptionsByEmail(email);

      expect(subscriptionRepository.getSubscriptionsByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(subscriptions);
    });
  });
});
