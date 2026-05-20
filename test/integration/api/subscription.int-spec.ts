import request from 'supertest';
import nock from 'nock';
import { createApp } from '../../../src/app';
import { createContainer } from '../../../src/container';
import { env } from '../../../src/config/env';
import { createPrismaClient, DBClient } from '../../../src/config/prisma';
import type { AppLogger } from '../../../src/common/modules/logger/interfaces/logger.interface';
import { EMAIL } from '../../../src/email/constants/email.const';
import type { SubscribeBody } from '../../../src/subscriptions/schemas/subscription.schema';
import type { SubscriptionCreateInput } from '../../../src/generated/prisma/models';
import type {
  GithubLatestReleaseApiResponse as GithubLatestReleaseApiFullResponse,
  GithubRepositoryApiResponse as GithubRepositoryApiFullResponse,
} from '../../../src/github/dto/github-api.response.dto';
import type { Application } from 'express';
import { GithubRateLimiterInterface } from '../../../src/github/utils/github-rate-limiter';
import { randomUUID } from 'node:crypto';

interface TransporterMock {
  verify: jest.Mock<Promise<true>, []>;
  sendMail: jest.Mock<Promise<unknown>, []>;
  close: jest.Mock<void, []>;
}

const transporterMock: TransporterMock = {
  verify: jest.fn().mockResolvedValue(true),
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  close: jest.fn(),
};

jest.mock('nodemailer', () => ({
  createTransport: () => transporterMock,
}));

type GithubRepositoryApiResponse = Pick<
  GithubRepositoryApiFullResponse,
  'id' | 'full_name' | 'private' | 'html_url'
>;

type GithubReleaseResponse = Pick<
  GithubLatestReleaseApiFullResponse,
  'id' | 'tag_name' | 'name' | 'html_url' | 'published_at'
>;

const githubApiUrl = env.GITHUB_API_URL;

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

const createSubscriptionCreateInput = (
  overrides: Partial<SubscriptionCreateInput> = {},
): SubscriptionCreateInput => ({
  email: testEmail,
  repo: testRepo,
  token: randomUUID(),
  confirmed: false,
  lastSeenTag: 'v1.0.0',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createGithubRepositoryResponse = (
  overrides: Partial<GithubRepositoryApiResponse> = {},
): GithubRepositoryApiResponse => {
  const fullName = overrides.full_name ?? testRepo;

  return {
    id: 10270250,
    full_name: fullName,
    private: false,
    html_url: `https://github.com/${fullName}`,
    ...overrides,
  };
};

const createGithubReleaseResponse = (
  overrides: Partial<GithubReleaseResponse> = {},
): GithubReleaseResponse => {
  const tagName = overrides.tag_name ?? 'v26.2.0';
  const repo = overrides.html_url?.match(/github\.com\/(.+)\/releases/)?.[1] ?? testRepo;

  return {
    id: 1,
    tag_name: tagName,
    name: tagName,
    html_url: `https://github.com/${repo}/releases/tag/${tagName}`,
    published_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

class SubscriptionTestDb {
  constructor(private readonly prisma: ReturnType<typeof createPrismaClient>) {}

  async clear(): Promise<void> {
    await this.prisma.subscription.deleteMany();
  }

  async create(subscriptionInput: SubscriptionCreateInput) {
    return this.prisma.subscription.create({
      data: subscriptionInput,
    });
  }

  async createMany(subscriptionsInput: SubscriptionCreateInput[]) {
    return this.prisma.subscription.createManyAndReturn({ data: subscriptionsInput });
  }

  async findByEmailAndRepo(email: string, repo: string) {
    return this.prisma.subscription.findFirst({
      where: {
        email,
        repo,
      },
    });
  }

  async findByToken(token: string) {
    return this.prisma.subscription.findUnique({
      where: {
        token,
      },
    });
  }
}

describe('Subscriptions API', () => {
  let prisma: DBClient;
  let db: SubscriptionTestDb;
  let app: Application;
  let githubRateLimiter: GithubRateLimiterInterface;

  beforeAll(async () => {
    const container = createContainer(env, { logger: createTestLogger() });
    prisma = container.prisma;
    await prisma.$connect();

    db = new SubscriptionTestDb(prisma);
    app = createApp(container);
    githubRateLimiter = container.githubRateLimiter;

    nock.disableNetConnect();
    nock.enableNetConnect((host) => host.includes('localhost') || host.includes('127.0.0.1'));
  });

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();

    await db.clear();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await db.clear();
    githubRateLimiter.unblock(); // Test-only reset for the current in-memory rate limiter implementation.

    jest.clearAllMocks();
    nock.cleanAll();
  });

  describe(`POST /api/subscribe`, () => {
    const SUBSCRIBE_URL = '/api/subscribe';

    it('should create subscription and send confirmation email', async () => {
      const repo = testRepo;
      const tagName = 'v26.2.0';
      const subscribeBody = createSubscribeBody({ repo });

      nock(githubApiUrl)
        .get(`/repos/${repo}`)
        .reply(200, createGithubRepositoryResponse({ full_name: repo }));

      nock(githubApiUrl)
        .get(`/repos/${repo}/releases/latest`)
        .reply(200, createGithubReleaseResponse({ tag_name: tagName }));

      const res = await request(app).post(SUBSCRIBE_URL).send(subscribeBody).expect(200);

      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const subscription = await db.findByEmailAndRepo(testEmail, repo);

      expect(subscription).toStrictEqual({
        id: expect.any(Number),
        token: expect.any(String),
        confirmed: false,
        lastSeenTag: tagName,
        createdAt: expect.any(Date),
        ...subscribeBody,
      });

      expect(subscription?.token).toHaveLength(36);

      expect(transporterMock.sendMail).toHaveBeenCalledTimes(1);
      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: subscribeBody.email,
          subject: EMAIL.SUBJECT_CONFIRMATION,
          html: expect.stringContaining(subscription!.token),
        }),
      );
    });
  });

  describe(`GET /api/confirm/:token`, () => {
    const CONFIRM_URL = (token: string) => `/api/confirm/${token}`;

    it('should confirm subscription and send confirmation success email', async () => {
      const subscriptionInput = createSubscriptionCreateInput({
        confirmed: false,
        lastSeenTag: 'v26.2.0',
      });
      const subscription = await db.create(subscriptionInput);

      const res = await request(app).get(CONFIRM_URL(subscription.token)).expect(200);

      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const confirmedSubscription = await db.findByToken(subscription.token);

      expect(confirmedSubscription).toStrictEqual({
        ...subscription,
        confirmed: true,
      });

      expect(transporterMock.sendMail).toHaveBeenCalledTimes(1);
      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: confirmedSubscription?.email,
          subject: EMAIL.SUBJECT_CONFIRMED,
          html: expect.stringContaining(`${env.APP_BASE_URL}/unsubscribe/${subscription.token}`),
        }),
      );
    });
  });

  describe(`GET /api/unsubscribe/:token`, () => {
    const UNSUBSCRIBE_URL = (token: string) => `/api/unsubscribe/${token}`;

    it('should delete subscription and send unsubscribe success email', async () => {
      const subscriptionInput = createSubscriptionCreateInput({
        confirmed: true,
        lastSeenTag: 'v26.2.0',
      });
      const subscription = await db.create(subscriptionInput);

      const res = await request(app).get(UNSUBSCRIBE_URL(subscription.token)).expect(200);

      expect(res.body).toEqual({ message: expect.any(String) });

      const deletedSubscription = await db.findByToken(subscription.token);

      expect(deletedSubscription).toBeNull();

      expect(transporterMock.sendMail).toHaveBeenCalledTimes(1);
      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: subscription.email,
          subject: EMAIL.SUBJECT_CANCELED,
          html: expect.stringContaining(testRepo),
        }),
      );
    });
  });

  describe(`GET /api/subscriptions`, () => {
    const SUBSCRIPTIONS_URL = '/api/subscriptions';

    it('should return subscriptions by email', async () => {
      const subscriptionsInput = [
        createSubscriptionCreateInput({
          email: testEmail,
          repo: 'nodejs/node',
          confirmed: true,
          lastSeenTag: 'v22.0.0',
        }),
        createSubscriptionCreateInput({
          email: testEmail,
          repo: 'nestjs/nest',
          confirmed: false,
          lastSeenTag: null,
        }),
        createSubscriptionCreateInput({
          email: 'other@example.com',
          repo: 'facebook/react',
          confirmed: true,
          lastSeenTag: 'v19.0.0',
        }),
      ];

      await db.createMany(subscriptionsInput);

      const res = await request(app).get(SUBSCRIPTIONS_URL).query({ email: testEmail }).expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual(
        expect.arrayContaining([
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
        ]),
      );

      expect(transporterMock.sendMail).not.toHaveBeenCalled();
    });
  });
});
