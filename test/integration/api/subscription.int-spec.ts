import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '../../../src/app';
import { createContainer } from '../../../src/container';
import { env } from '../../../src/config/env';
import type { PrismaDBClient } from '../../../src/infrastructure/database/prisma';
import type { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';
import type { SubscribeBody } from '../../../src/modules/subscription/schemas/subscription.schema';
import type {
  SubscribeSagaCreateInput,
  SubscriptionCreateInput,
  SubscriptionRepositoryCreateInput,
} from '../../../libs/database/generated/prisma/models';
import { RabbitMqConnection } from '../../../libs/infrastructure/message-broker/rabbitmq.connection';
import { SUBSCRIPTION_EVENT_ROUTING_KEYS } from '../../../libs/contracts/main/messaging/routing-keys';
import { SUBSCRIBE_SAGA_STATES } from '../../../src/modules/subscription/saga/constants/subscribe-saga.const';

const testEmail = 'test@example.com';
const testRepo = 'nodejs/node';

const createTestLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
});

const createSubscribeBody = (overrides: Partial<SubscribeBody> = {}): SubscribeBody => ({
  email: testEmail,
  repo: testRepo,
  ...overrides,
});

let createRepositoryCounter = 1;
const createRepositoryInput = (
  overrides: Partial<Omit<SubscriptionRepositoryCreateInput, 'subscriptions'>> = {},
): SubscriptionRepositoryCreateInput => ({
  id: createRepositoryCounter++,
  repoName: testRepo,
  lastSeenTag: 'v1.0.0',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createSubscriptionInput = (
  repositoryId: number,
  overrides: Partial<SubscriptionCreateInput> = {},
): SubscriptionCreateInput => ({
  email: testEmail,
  token: randomUUID(),
  confirmed: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  repository: {
    connect: { id: repositoryId },
  },
  ...overrides,
});

const _createSubscribeSagaInput = (
  overrides: Partial<SubscribeSagaCreateInput> = {},
): SubscribeSagaCreateInput => ({
  email: testEmail,
  repoName: testRepo,
  state: SUBSCRIBE_SAGA_STATES.STARTED,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

class SubscriptionTestDb {
  constructor(private readonly prisma: PrismaDBClient) {}

  async clear(): Promise<void> {
    await this.prisma.subscription.deleteMany();
    await this.prisma.subscribeSaga.deleteMany();
    await this.prisma.subscriptionRepository.deleteMany();
  }

  async createRepository(data: SubscriptionRepositoryCreateInput) {
    return this.prisma.subscriptionRepository.create({ data });
  }

  async createSubscription(data: SubscriptionCreateInput) {
    return this.prisma.subscription.create({
      data,
      include: { repository: true },
    });
  }

  async createSaga(data: SubscribeSagaCreateInput) {
    return this.prisma.subscribeSaga.create({ data });
  }

  async findSubscriptionByEmailAndRepo(email: string, repoName: string) {
    return this.prisma.subscription.findFirst({
      where: {
        email,
        repository: { repoName },
      },
      include: { repository: true },
    });
  }

  async findSubscriptionByToken(token: string) {
    return this.prisma.subscription.findUnique({
      where: { token },
      include: { repository: true },
    });
  }

  async findSagaById(id: number) {
    return this.prisma.subscribeSaga.findUnique({
      where: { id },
    });
  }

  async countSubscriptionsByEmailAndRepo(email: string, repoName: string): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        email,
        repository: { repoName },
      },
    });
  }
}

describe('Subscriptions API', () => {
  let prisma: PrismaDBClient;
  let db: SubscriptionTestDb;
  let rabbitMqConnection: RabbitMqConnection;
  let subscriptionEventProduceSpy: jest.SpyInstance;
  let subscribeSagaTrackCommandProduceSpy: jest.SpyInstance;
  let app: Application;

  beforeAll(async () => {
    const container = createContainer(env, { logger: createTestLogger() });
    prisma = container.prisma;
    await prisma.$connect();

    rabbitMqConnection = container.rabbitMqConnection;

    db = new SubscriptionTestDb(prisma);
    app = createApp(container);

    subscriptionEventProduceSpy = jest.spyOn(
      container.producers.subscription.subscriptionBaseMessageProducer,
      'produce',
    );

    subscribeSagaTrackCommandProduceSpy = jest.spyOn(
      container.producers.subscription.subscribeSagaCommandProducer,
      'produceTrackRepo',
    );
  });

  afterAll(async () => {
    await db.clear();
    await prisma.$disconnect();
    await rabbitMqConnection.close();
  });

  beforeEach(async () => {
    await db.clear();

    subscriptionEventProduceSpy.mockClear();
    subscribeSagaTrackCommandProduceSpy.mockClear();

    jest.clearAllMocks();
  });

  describe(`POST /api/subscribe`, () => {
    const SUBSCRIBE_URL = '/api/subscribe';

    it('should create subscription, send confirmation email and return 201 when repository already exists', async () => {
      const repo = testRepo;
      const subscribeBody = createSubscribeBody({ repo });

      const existingRepo = await db.createRepository(createRepositoryInput({ repoName: repo }));

      const res = await request(app).post(SUBSCRIBE_URL).send(subscribeBody).expect(201);

      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const subscription = await db.findSubscriptionByEmailAndRepo(testEmail, repo);

      expect(subscription).toStrictEqual({
        id: expect.any(Number),
        repositoryId: existingRepo.id,
        email: subscribeBody.email,
        token: expect.any(String),
        confirmed: false,
        createdAt: expect.any(Date),
        repository: expect.any(Object),
      });

      expect(subscription?.token).toHaveLength(36);

      expect(subscriptionEventProduceSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProduceSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENT_ROUTING_KEYS.SUBSCRIBED,
        expect.objectContaining({
          email: subscribeBody.email,
          confirmationUrl: expect.stringContaining(`/confirm/${subscription?.token}`),
          repo: subscribeBody.repo,
        }),
      );

      expect(subscribeSagaTrackCommandProduceSpy).not.toHaveBeenCalled();
    });

    it('should initialize saga, return 202, and send track command when repository does not exist', async () => {
      const repoName = testRepo;
      const subscribeBody = createSubscribeBody({ repo: repoName });

      const res = await request(app).post(SUBSCRIBE_URL).send(subscribeBody).expect(202);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        operationId: expect.any(String),
      });

      const subscription = await db.findSubscriptionByEmailAndRepo(subscribeBody.email, repoName);
      expect(subscription).toBeNull();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const operationId = Number(res.body?.operationId) || 0;
      const saga = await db.findSagaById(operationId);

      expect(saga).toEqual(
        expect.objectContaining({
          email: subscribeBody.email,
          repoName,
          state: SUBSCRIBE_SAGA_STATES.STARTED,
        }),
      );

      expect(subscribeSagaTrackCommandProduceSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSagaTrackCommandProduceSpy).toHaveBeenCalledWith(repoName, {
        correlationId: operationId,
      });

      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if repo format is invalid', async () => {
      const subscribeBody = createSubscribeBody({
        repo: 'invalid-repo-format',
      });

      const res = await request(app).post(SUBSCRIBE_URL).send(subscribeBody).expect(400);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        details: expect.arrayContaining([
          {
            path: ['repo'],
            message: expect.any(String),
          },
        ]),
      });

      expect(
        await db.countSubscriptionsByEmailAndRepo(subscribeBody.email, subscribeBody.repo),
      ).toBe(0);
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
      expect(subscribeSagaTrackCommandProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 400 if request body is empty', async () => {
      const res = await request(app).post(SUBSCRIBE_URL).send({}).expect(400);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: expect.any(String),
          }),
          expect.objectContaining({
            path: ['repo'],
            message: expect.any(String),
          }),
        ]),
      });

      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
      expect(subscribeSagaTrackCommandProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate subscription without sending email', async () => {
      const repoName = testRepo;
      const subscribeBody = createSubscribeBody({ repo: repoName });

      const repo = await db.createRepository(createRepositoryInput({ repoName }));
      await db.createSubscription(
        createSubscriptionInput(repo.id, {
          email: subscribeBody.email,
          confirmed: true,
        }),
      );

      const res = await request(app).post(SUBSCRIBE_URL).send(subscribeBody).expect(409);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
      });

      expect(await db.countSubscriptionsByEmailAndRepo(subscribeBody.email, repoName)).toBe(1);
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
      expect(subscribeSagaTrackCommandProduceSpy).not.toHaveBeenCalled();
    });
  });

  describe(`GET /api/confirm/:token`, () => {
    const CONFIRM_URL = (token: string) => `/api/confirm/${token}`;

    it('should confirm subscription and send confirmation success email', async () => {
      const repo = await db.createRepository(createRepositoryInput());
      const subscriptionInput = createSubscriptionInput(repo.id, {
        confirmed: false,
      });
      const subscription = await db.createSubscription(subscriptionInput);

      const res = await request(app).get(CONFIRM_URL(subscription.token)).expect(200);

      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const confirmedSubscription = await db.findSubscriptionByToken(subscription.token);

      expect(confirmedSubscription).toStrictEqual({
        ...subscription,
        confirmed: true,
      });

      expect(subscriptionEventProduceSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProduceSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENT_ROUTING_KEYS.CONFIRMED,
        expect.objectContaining({
          email: subscription.email,
          unsubscribeUrl: expect.stringContaining(`/unsubscribe/${subscription.token}`),
          repo: repo.repoName,
        }),
      );
    });

    it('should return 400 if token is invalid', async () => {
      const invalidToken = 'invalid-token';

      const res = await request(app).get(CONFIRM_URL(invalidToken)).expect(400);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['token'],
            message: expect.any(String),
          }),
        ]),
      });
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 404 if subscription does not exist', async () => {
      const token = randomUUID();

      const res = await request(app).get(CONFIRM_URL(token)).expect(404);

      expect(res.body).toStrictEqual({ message: expect.any(String) });
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 200 without sending email or updating db if subscription is already confirmed', async () => {
      const repo = await db.createRepository(createRepositoryInput());
      const subscriptionInput = createSubscriptionInput(repo.id, {
        confirmed: true,
      });
      const subscription = await db.createSubscription(subscriptionInput);

      const res = await request(app).get(CONFIRM_URL(subscription.token)).expect(200);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
      });

      const subscriptionAfterRequest = await db.findSubscriptionByToken(subscription.token);
      expect(subscriptionAfterRequest).toStrictEqual(subscription);
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });
  });

  describe(`GET /api/unsubscribe/:token`, () => {
    const UNSUBSCRIBE_URL = (token: string) => `/api/unsubscribe/${token}`;

    it('should delete subscription and send unsubscribe success email', async () => {
      const repo = await db.createRepository(createRepositoryInput());
      const subscriptionInput = createSubscriptionInput(repo.id, {
        confirmed: true,
      });
      const subscription = await db.createSubscription(subscriptionInput);

      const res = await request(app).get(UNSUBSCRIBE_URL(subscription.token)).expect(200);

      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const deletedSubscription = await db.findSubscriptionByToken(subscription.token);

      expect(deletedSubscription).toBeNull();

      expect(subscriptionEventProduceSpy).toHaveBeenCalledTimes(1);
      expect(subscriptionEventProduceSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENT_ROUTING_KEYS.UNSUBSCRIBED,
        expect.objectContaining({
          email: subscription.email,
          repo: repo.repoName,
        }),
      );
    });

    it('should return 400 if token is invalid', async () => {
      const invalidToken = 'invalid-token';

      const res = await request(app).get(UNSUBSCRIBE_URL(invalidToken)).expect(400);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['token'],
            message: expect.any(String),
          }),
        ]),
      });
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });

    it('should return 404 if subscription does not exist', async () => {
      const token = randomUUID();
      const res = await request(app).get(UNSUBSCRIBE_URL(token)).expect(404);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
      });
      expect(subscriptionEventProduceSpy).not.toHaveBeenCalled();
    });
  });

  describe(`GET /api/subscriptions`, () => {
    const SUBSCRIPTIONS_URL = '/api/subscriptions';

    it('should return subscriptions by email', async () => {
      const nodeRepo = await db.createRepository(
        createRepositoryInput({ repoName: 'nodejs/node', lastSeenTag: 'v22.0.0' }),
      );
      const nestRepo = await db.createRepository(
        createRepositoryInput({ repoName: 'nestjs/nest', lastSeenTag: null }),
      );
      const reactRepo = await db.createRepository(
        createRepositoryInput({ repoName: 'facebook/react', lastSeenTag: 'v19.0.0' }),
      );

      await db.createSubscription(
        createSubscriptionInput(nodeRepo.id, { email: testEmail, confirmed: true }),
      );
      await db.createSubscription(
        createSubscriptionInput(nestRepo.id, { email: testEmail, confirmed: false }),
      );
      await db.createSubscription(
        createSubscriptionInput(reactRepo.id, { email: 'other@example.com', confirmed: true }),
      );

      const res = await request(app).get(SUBSCRIPTIONS_URL).query({ email: testEmail }).expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body).toStrictEqual([
        {
          email: testEmail,
          repo: 'nodejs/node',
          confirmed: true,
          last_seen_tag: 'v22.0.0',
        },
        {
          email: testEmail,
          repo: 'nestjs/nest',
          confirmed: false,
          last_seen_tag: null,
        },
      ]);
    });

    it('should return 400 if email query is invalid', async () => {
      const res = await request(app)
        .get(SUBSCRIPTIONS_URL)
        .query({ email: 'invalid-email' })
        .expect(400);

      expect(res.body).toStrictEqual({
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: expect.any(String),
          }),
        ]),
      });
    });

    it('should return empty array if email has no subscriptions', async () => {
      const nodeRepo = await db.createRepository(
        createRepositoryInput({ repoName: 'nodejs/node', lastSeenTag: 'v22.0.0' }),
      );
      const nestRepo = await db.createRepository(
        createRepositoryInput({ repoName: 'nestjs/nest', lastSeenTag: null }),
      );

      await db.createSubscription(
        createSubscriptionInput(nodeRepo.id, { email: 'test1@example.com', confirmed: true }),
      );
      await db.createSubscription(
        createSubscriptionInput(nestRepo.id, { email: 'test2@example.com', confirmed: false }),
      );

      const res = await request(app).get(SUBSCRIPTIONS_URL).query({ email: testEmail }).expect(200);

      expect(res.body).toStrictEqual([]);
    });
  });
});
