import { NotFoundError } from '../../../libs/common/utils/errors/custom-errors';
import { SubscriptionRepositoryInterface } from './interfaces/subscription.repository.interface';
import { SubscriptionService } from './subscription.service';
import { SubscribeBody } from './schemas/subscription.schema';
import { Subscription, SubscriptionWithRepository } from './types/subscription';
import {
  SubscriptionEventProducerInterface,
  SubscriptionRepositoryReleaseEventProducerInterface,
} from './interfaces/subscription-event.producer';
import { RepositoryRepositoryReadableInterface, SubscriptionRepository } from '../repository';
import { SubscribeSagaRepository } from './saga/interfaces/subscribe-saga.repository.interface';
import { SubscribeSagaCommandProducer } from './saga/subscribe-saga-command.producer';
import { RepositoryReleaseDetectedEvent } from './schemas/repository-release.schema';
import { SubscribeSaga } from './saga/types/subscribe-saga';
import { SUBSCRIPTION_OPERATION_STATUSES } from './constants/subscriptions.const';
import {
  SUBSCRIBE_SAGA_ERROR_REASON,
  SUBSCRIBE_SAGA_STATES,
} from './saga/constants/subscribe-saga.const';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let subscriptionRepository: jest.Mocked<SubscriptionRepositoryInterface>;
  let repositoryRepository: jest.Mocked<RepositoryRepositoryReadableInterface>;
  let subscriptionEventProducer: jest.Mocked<
    SubscriptionEventProducerInterface & SubscriptionRepositoryReleaseEventProducerInterface
  >;
  let subscribeSagaRepository: jest.Mocked<SubscribeSagaRepository>;
  let subscribeSagaCommandProducer: jest.Mocked<SubscribeSagaCommandProducer>;

  const testEmail = 'test@example.com';
  const testRepoName = 'owner/repo';
  const testToken = 'test-token';
  const baseSubscriptionUrl = 'http://localhost:3000/api';

  const createSubscribeInput = (email: string, repo: string): SubscribeBody => ({
    email,
    repo,
  });

  const createRepository = (
    overrides: Partial<SubscriptionRepository> = {},
  ): SubscriptionRepository => ({
    id: 1,
    repo: testRepoName,
    lastSeenTag: 'v1.0.0',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const createRepositoryRelease = (
    overrides: Partial<RepositoryReleaseDetectedEvent> = {},
  ): RepositoryReleaseDetectedEvent => ({
    id: 1,
    repoName: testRepoName,
    name: 'name',
    tagName: 'v1.2.3',
    htmlUrl: `https://github.com/${testRepoName}/releases/tag/v1.2.3`,
    publishedAt: '2026-04-12T10:00:00.000Z',
    ...overrides,
  });

  const createSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: 1,
    repositoryId: 1,
    email: testEmail,
    token: testToken,
    confirmed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const createSubscribeSaga = (overrides: Partial<SubscribeSaga> = {}): SubscribeSaga => ({
    id: 1,
    email: testEmail,
    repoName: testRepoName,
    state: 'STARTED',
    subscriptionId: null,
    repoId: null,
    errorReason: null,
    errorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const concatSubscriptionWithRepository = (
    subscription: Subscription,
    repository: SubscriptionRepository,
  ): SubscriptionWithRepository => ({
    ...subscription,
    repositoryId: repository.id,
    repository,
  });

  beforeAll(() => {
    subscriptionRepository = {
      getSubscriptionByToken: jest.fn(),
      getConfirmedSubscriptions: jest.fn(),
      getSubscriptionsWithRepoByEmail: jest.fn(),
      getSubscriptionsByRepo: jest.fn(),
      create: jest.fn(),
      confirmByToken: jest.fn(),
      updateByToken: jest.fn(),
      deleteByToken: jest.fn(),
      deleteUnconfirmed: jest.fn(),
    };

    repositoryRepository = {
      getByRepoName: jest.fn(),
    };

    subscriptionEventProducer = {
      produceSubscriptionConfirmed: jest.fn(),
      produceSubscriptionCreated: jest.fn(),
      produceSubscriptionUnsubscribed: jest.fn(),
      produceSubscriptionRepositoryRelease: jest.fn(),
    };

    subscribeSagaRepository = {
      getById: jest.fn(),
      create: jest.fn(),
      markRepoTracked: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
      markCompensated: jest.fn(),
    };

    subscribeSagaCommandProducer = {
      produceTrackRepo: jest.fn(),
      produceUntrackRepo: jest.fn(),
    } as unknown as jest.Mocked<SubscribeSagaCommandProducer>;

    subscriptionService = new SubscriptionService(
      subscriptionRepository,
      repositoryRepository,
      subscriptionEventProducer,
      subscribeSagaRepository,
      subscribeSagaCommandProducer,
      baseSubscriptionUrl,
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getConfirmedSubscriptions', () => {
    it('should return all confirmed subscriptions', async () => {
      const subscriptions = [
        createSubscription({ confirmed: true }),
        createSubscription({ id: 2, email: 'second@example.com', confirmed: true }),
      ];

      subscriptionRepository.getConfirmedSubscriptions.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getConfirmedSubscriptions();

      expect(subscriptionRepository.getConfirmedSubscriptions).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getConfirmedSubscriptions).toHaveBeenCalledWith();
      expect(result).toStrictEqual(subscriptions);
    });
  });

  describe('getSubscriptionsWithRepoByEmail', () => {
    it('should return subscriptions with populated repository by email', async () => {
      const email = testEmail;
      const subscription = createSubscription({ email });
      const relatedRepository = createRepository();
      const subscriptionWithRepo = concatSubscriptionWithRepository(
        subscription,
        relatedRepository,
      );

      subscriptionRepository.getSubscriptionsWithRepoByEmail.mockResolvedValue([
        subscriptionWithRepo,
      ]);

      const result = await subscriptionService.getSubscriptionsWithRepoByEmail(email);

      expect(subscriptionRepository.getSubscriptionsWithRepoByEmail).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionsWithRepoByEmail).toHaveBeenCalledWith(email);
      expect(result).toStrictEqual([subscriptionWithRepo]);
    });
  });

  describe('getSubscriptionsByRepo', () => {
    it('should return subscriptions by repository name', async () => {
      const targetRepo = 'target/repo';
      const subscriptions = [createSubscription({ repositoryId: 2 })];

      subscriptionRepository.getSubscriptionsByRepo.mockResolvedValue(subscriptions);

      const result = await subscriptionService.getSubscriptionsByRepo(targetRepo);

      expect(subscriptionRepository.getSubscriptionsByRepo).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionsByRepo).toHaveBeenCalledWith(targetRepo);
      expect(result).toStrictEqual(subscriptions);
    });
  });

  describe('createSubscription', () => {
    it('should save subscription with generated token and dispatch creation event', async () => {
      const email = testEmail;
      const repoId = 5;
      const repoName = testRepoName;
      const generatedSubscription = createSubscription({
        email,
        repositoryId: repoId,
      });

      subscriptionRepository.create.mockResolvedValue(generatedSubscription);

      const result = await subscriptionService.createSubscription(email, repoId, repoName);

      expect(subscriptionRepository.create).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.create).toHaveBeenCalledWith({
        email,
        repositoryId: repoId,
        token: expect.any(String),
      });
      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionCreated).toHaveBeenCalledWith(
        email,
        expect.stringContaining(generatedSubscription.token),
        repoName,
      );
      expect(result).toStrictEqual(generatedSubscription);
    });
  });

  describe('subscribe', () => {
    it('should call createSubscription and return SUCCESS status when repository exists', async () => {
      const existingRepository = createRepository();
      const newSubscription = createSubscription();
      const subscribeInput = createSubscribeInput(newSubscription.email, existingRepository.repo);

      repositoryRepository.getByRepoName.mockResolvedValue(existingRepository);

      const createSubscriptionSpy = jest
        .spyOn(subscriptionService, 'createSubscription')
        .mockResolvedValue(newSubscription);

      const result = await subscriptionService.subscribe(subscribeInput);

      expect(repositoryRepository.getByRepoName).toHaveBeenCalledTimes(1);
      expect(repositoryRepository.getByRepoName).toHaveBeenCalledWith(subscribeInput.repo);

      expect(createSubscriptionSpy).toHaveBeenCalledTimes(1);
      expect(createSubscriptionSpy).toHaveBeenCalledWith(
        subscribeInput.email,
        existingRepository.id,
        subscribeInput.repo,
      );

      expect(subscribeSagaRepository.create).not.toHaveBeenCalled();
      expect(subscribeSagaCommandProducer.produceTrackRepo).not.toHaveBeenCalled();

      expect(result).toStrictEqual({ status: SUBSCRIPTION_OPERATION_STATUSES.SUCCESS });

      createSubscriptionSpy.mockRestore();
    });

    it('should initialize saga, dispatch track command, and return PENDING status when repository does not exist', async () => {
      const email = testEmail;
      const repo = testRepoName;
      const subscribeInput = createSubscribeInput(email, repo);
      const createdSaga = createSubscribeSaga();

      repositoryRepository.getByRepoName.mockResolvedValue(null);
      subscribeSagaRepository.create.mockResolvedValue(createdSaga);

      const createSubscriptionSpy = jest.spyOn(subscriptionService, 'createSubscription');

      const result = await subscriptionService.subscribe(subscribeInput);

      expect(repositoryRepository.getByRepoName).toHaveBeenCalledTimes(1);
      expect(repositoryRepository.getByRepoName).toHaveBeenCalledWith(subscribeInput.repo);

      expect(createSubscriptionSpy).not.toHaveBeenCalled();

      expect(subscribeSagaRepository.create).toHaveBeenCalledTimes(1);
      expect(subscribeSagaRepository.create).toHaveBeenCalledWith({
        email: subscribeInput.email,
        repoName: subscribeInput.repo,
      });

      expect(subscribeSagaCommandProducer.produceTrackRepo).toHaveBeenCalledTimes(1);
      expect(subscribeSagaCommandProducer.produceTrackRepo).toHaveBeenCalledWith(
        subscribeInput.repo,
        { correlationId: createdSaga.id },
      );

      expect(result).toStrictEqual({
        status: SUBSCRIPTION_OPERATION_STATUSES.PENDING,
        operationId: createdSaga.id,
      });

      createSubscriptionSpy.mockRestore();
    });
  });

  describe('confirm', () => {
    it('should confirm subscription and dispatch confirmed event when valid unconfirmed token is provided', async () => {
      const token = testToken;
      const relatedRepository = createRepository();
      const unconfirmedSubscription = createSubscription({ token, confirmed: false });
      const confirmedSubscription: Subscription = { ...unconfirmedSubscription, confirmed: true };
      const confirmedWithRepo = concatSubscriptionWithRepository(
        confirmedSubscription,
        relatedRepository,
      );

      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(unconfirmedSubscription);
      subscriptionRepository.confirmByToken.mockResolvedValue(confirmedWithRepo);

      await subscriptionService.confirm(token);

      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledWith(token);

      expect(subscriptionRepository.confirmByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.confirmByToken).toHaveBeenCalledWith(token);

      expect(subscriptionEventProducer.produceSubscriptionConfirmed).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).toHaveBeenCalledWith(
        confirmedWithRepo.email,
        expect.stringContaining(token),
        confirmedWithRepo.repository.repo,
      );
    });

    it('should exit early without updates and events when subscription is already confirmed', async () => {
      const token = testToken;
      const confirmedSubscription = createSubscription({ token, confirmed: true });

      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(confirmedSubscription);

      await subscriptionService.confirm(token);

      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledWith(token);

      expect(subscriptionRepository.confirmByToken).not.toHaveBeenCalled();
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when token does not match any subscription', async () => {
      const invalidToken = 'invalid-token';

      subscriptionRepository.getSubscriptionByToken.mockResolvedValue(null);

      await expect(subscriptionService.confirm(invalidToken)).rejects.toThrow(NotFoundError);

      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.getSubscriptionByToken).toHaveBeenCalledWith(invalidToken);

      expect(subscriptionRepository.confirmByToken).not.toHaveBeenCalled();
      expect(subscriptionEventProducer.produceSubscriptionConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should delete subscription by token and dispatch unsubscribed event', async () => {
      const token = testToken;
      const deletedSubscription = createSubscription({ token });
      const relatedRepository = createRepository();
      const deletedWithRepo = concatSubscriptionWithRepository(
        deletedSubscription,
        relatedRepository,
      );

      subscriptionRepository.deleteByToken.mockResolvedValue(deletedWithRepo);

      await subscriptionService.unsubscribe(token);

      expect(subscriptionRepository.deleteByToken).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.deleteByToken).toHaveBeenCalledWith(token);

      expect(subscriptionEventProducer.produceSubscriptionUnsubscribed).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProducer.produceSubscriptionUnsubscribed).toHaveBeenCalledWith(
        deletedWithRepo.email,
        deletedWithRepo.repository.repo,
      );
    });
  });

  describe('deleteUnconfirmed', () => {
    it('should delete unconfirmed subscriptions older than specified expiration time and return count', async () => {
      const expirationTimeInMs = 600_000;
      const deletedCount = 5;

      subscriptionRepository.deleteUnconfirmed.mockResolvedValue(deletedCount);

      const result = await subscriptionService.deleteUnconfirmed(expirationTimeInMs);

      expect(subscriptionRepository.deleteUnconfirmed).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.deleteUnconfirmed).toHaveBeenCalledWith(expirationTimeInMs);
      expect(result).toStrictEqual(deletedCount);
    });
  });

  describe('processRepositoryRelease', () => {
    it('should retrieve subscriptions by repository and dispatch release event for each', async () => {
      const release = createRepositoryRelease();
      const subscriptionOne = createSubscription({ email: 'first@example.com', token: 'token-1' });
      const subscriptionTwo = createSubscription({ email: 'second@example.com', token: 'token-2' });
      const subscriptions = [subscriptionOne, subscriptionTwo];

      const getSubscriptionsByRepoSpy = jest
        .spyOn(subscriptionService, 'getSubscriptionsByRepo')
        .mockResolvedValue(subscriptions);

      await subscriptionService.processRepositoryRelease(release);

      expect(getSubscriptionsByRepoSpy).toHaveBeenCalledTimes(1);
      expect(getSubscriptionsByRepoSpy).toHaveBeenCalledWith(release.repoName);

      expect(subscriptionEventProducer.produceSubscriptionRepositoryRelease).toHaveBeenCalledTimes(
        2,
      );
      expect(
        subscriptionEventProducer.produceSubscriptionRepositoryRelease,
      ).toHaveBeenNthCalledWith(
        1,
        subscriptionOne.email,
        release,
        expect.stringContaining(subscriptionOne.token),
      );
      expect(
        subscriptionEventProducer.produceSubscriptionRepositoryRelease,
      ).toHaveBeenNthCalledWith(
        2,
        subscriptionTwo.email,
        release,
        expect.stringContaining(subscriptionTwo.token),
      );

      getSubscriptionsByRepoSpy.mockRestore();
    });
  });

  describe('getSubscriptionOperation', () => {
    it('should return null when saga does not exist', async () => {
      const operationId = 999;
      subscribeSagaRepository.getById.mockResolvedValue(null);

      const result = await subscriptionService.getSubscriptionOperation(operationId);

      expect(subscribeSagaRepository.getById).toHaveBeenCalledTimes(1);
      expect(subscribeSagaRepository.getById).toHaveBeenCalledWith(operationId);
      expect(result).toBeNull();
    });

    it.each([SUBSCRIBE_SAGA_STATES.STARTED, SUBSCRIBE_SAGA_STATES.REPOSITORY_TRACKED])(
      'should return PENDING status when saga state is %s',
      async (state) => {
        const saga = createSubscribeSaga({ state });
        subscribeSagaRepository.getById.mockResolvedValue(saga);

        const result = await subscriptionService.getSubscriptionOperation(saga.id);

        expect(subscribeSagaRepository.getById).toHaveBeenCalledTimes(1);
        expect(subscribeSagaRepository.getById).toHaveBeenCalledWith(saga.id);
        expect(result).toStrictEqual({
          status: SUBSCRIPTION_OPERATION_STATUSES.PENDING,
          startedAt: saga.createdAt,
        });
      },
    );

    it.each([SUBSCRIBE_SAGA_STATES.FAILED, SUBSCRIBE_SAGA_STATES.COMPENSATED])(
      'should return FAILED status with error details when saga state is %s',
      async (state) => {
        const saga = createSubscribeSaga({
          state,
          errorReason: SUBSCRIBE_SAGA_ERROR_REASON.GITHUB_REPO_NOT_FOUND,
          errorMessage: 'Repo not found',
        });
        subscribeSagaRepository.getById.mockResolvedValue(saga);

        const result = await subscriptionService.getSubscriptionOperation(saga.id);

        expect(result).toStrictEqual({
          status: SUBSCRIPTION_OPERATION_STATUSES.FAILED,
          startedAt: saga.createdAt,
          errorReason: saga.errorReason,
          errorMessage: saga.errorMessage,
        });
      },
    );

    it('should fallback to UNKNOWN error reason when reason is null in error states', async () => {
      const saga = createSubscribeSaga({
        state: SUBSCRIBE_SAGA_STATES.FAILED,
        errorReason: null,
        errorMessage: null,
      });
      subscribeSagaRepository.getById.mockResolvedValue(saga);

      const result = await subscriptionService.getSubscriptionOperation(saga.id);

      expect(result).toStrictEqual({
        status: SUBSCRIPTION_OPERATION_STATUSES.FAILED,
        startedAt: saga.createdAt,
        errorReason: SUBSCRIBE_SAGA_ERROR_REASON.UNKNOWN,
        errorMessage: null,
      });
    });

    it('should return SUCCESS status for any other state (e.g., COMPLETED)', async () => {
      const saga = createSubscribeSaga({ state: SUBSCRIBE_SAGA_STATES.COMPLETED });
      subscribeSagaRepository.getById.mockResolvedValue(saga);

      const result = await subscriptionService.getSubscriptionOperation(saga.id);

      expect(result).toStrictEqual({
        status: SUBSCRIPTION_OPERATION_STATUSES.SUCCESS,
        startedAt: saga.createdAt,
      });
    });
  });
});
