import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import {
  createGithubRepoReleaseResponse,
  createGithubRepoResponse,
  GithubApiMock,
} from './mocks/github-api.mock';
import { SubscriptionPage } from './pages/subscription.page';
import { MailpitClient } from './mocks/email-inbox.mock';

function createUniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toFixed(5)}@example.com`;
}

function createMissingRepoName() {
  return `missing-owner-${Date.now()}/missing-repo-${Math.random().toFixed(5)}`;
}

const wireMockBaseUrl = process.env.WIREMOCK_URL || 'http://localhost:8080';
const mailpitBaseUrl = process.env.MAILPIT_URL || 'http://localhost:8025';

test.describe('Subscription e2e creation', () => {
  let subscriptionPage: SubscriptionPage;
  let githubApiMock: GithubApiMock;
  let mailpitClient: MailpitClient;

  async function cleanup(request: APIRequestContext) {
    githubApiMock = new GithubApiMock(wireMockBaseUrl, request);
    await githubApiMock.reset();

    mailpitClient = new MailpitClient(mailpitBaseUrl, request);
    await mailpitClient.clear();
  }

  test.beforeEach(async ({ page, request }) => {
    await cleanup(request);

    subscriptionPage = new SubscriptionPage(page);
    await subscriptionPage.goto();
  });

  test.afterAll(async ({ request }) => {
    await cleanup(request);
  });

  test('should render subscription page', async () => {
    await expect(subscriptionPage.emailInput).toBeVisible();
    await expect(subscriptionPage.repoInput).toBeVisible();
    await expect(subscriptionPage.submitButton).toBeVisible();
  });

  test('should create subscription and show success message', async () => {
    const email = createUniqueEmail();
    const repo = 'nodejs/node';

    const repositoryRes = createGithubRepoResponse(repo);
    const repoReleaseRes = createGithubRepoReleaseResponse(repo);

    await githubApiMock.mockRepository(repo, repositoryRes);
    await githubApiMock.mockRepoRelease(repo, repoReleaseRes);

    await subscriptionPage.emailInput.fill(email);
    await subscriptionPage.repoInput.fill(repo);
    await subscriptionPage.submitButton.click();

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/success/i);
    await expect(subscriptionPage.statusMessage).toContainText(/successful/i);

    const message = await mailpitClient.waitForMessage({
      to: email,
      subject: /subscription confirmation/i,
    });

    expect(message.Subject).toMatch(/subscription confirmation/i);
  });

  test('should show validation error for invalid repo format', async () => {
    await subscriptionPage.subscribe({
      email: createUniqueEmail(),
      repo: 'invalid-format',
    });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/error/i);
    await expect(subscriptionPage.statusMessage).toContainText(/owner\/repo format/i);
  });

  test('should show repository not found error', async () => {
    const email = createUniqueEmail();
    const repo = createMissingRepoName();

    await githubApiMock.mockRepositoryError(repo, {
      status: 404,
      jsonBody: { message: 'Repository not found' },
    });

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/error/i);
    await expect(subscriptionPage.statusMessage).toContainText(/repository not found/i);
  });

  test('should show duplicate subscription error', async () => {
    const email = createUniqueEmail();
    const repo = 'expressjs/express';

    const repositoryRes = createGithubRepoResponse(repo);
    const repoReleaseRes = createGithubRepoReleaseResponse(repo);

    await githubApiMock.mockRepository(repo, repositoryRes);
    await githubApiMock.mockRepoRelease(repo, repoReleaseRes);

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/success/i);
    await expect(subscriptionPage.statusMessage).toContainText(/subscription successful/i);

    const message = await mailpitClient.waitForMessage({
      to: email,
      subject: /subscription confirmation/i,
    });
    expect(message.Subject).toMatch(/subscription confirmation/i);

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/error/i);
    await expect(subscriptionPage.statusMessage).toContainText(/already exists/i);

    await expect.poll(() => mailpitClient.countMessages(), { timeout: 5_000 }).toBe(1);
  });
});
