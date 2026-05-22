import { expect, test } from '@playwright/test';
import { SubscriptionPage } from './pages/subscription.page';

function createUniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toFixed(5)}@example.com`;
}

function createMissingRepoName() {
  return `missing-owner-${Date.now()}/missing-repo-${Math.random().toFixed(5)}`;
}

test.describe('Subscription e2e creation', () => {
  let subscriptionPage: SubscriptionPage;

  test.beforeEach(async ({ page }) => {
    subscriptionPage = new SubscriptionPage(page);
    await subscriptionPage.goto();
  });

  test('should render subscription page', async () => {
    await expect(subscriptionPage.emailInput).toBeVisible();
    await expect(subscriptionPage.repoInput).toBeVisible();
    await expect(subscriptionPage.submitButton).toBeVisible();
  });

  test('should create subscription and show success message', async () => {
    const email = createUniqueEmail();
    const repo = 'nodejs/node';

    await subscriptionPage.emailInput.fill(email);
    await subscriptionPage.repoInput.fill(repo);
    await subscriptionPage.submitButton.click();

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/success/i);
    await expect(subscriptionPage.statusMessage).toContainText(/successful/i);
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

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/error/i);
    await expect(subscriptionPage.statusMessage).toContainText(/repository not found/i);
  });

  test('should show duplicate subscription error', async () => {
    const email = createUniqueEmail();
    const repo = 'expressjs/express';

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/success/i);
    await expect(subscriptionPage.statusMessage).toContainText(/subscription successful/i);

    await subscriptionPage.subscribe({ email, repo });

    await expect(subscriptionPage.statusMessage).toBeVisible();
    await expect(subscriptionPage.statusMessage).toHaveClass(/error/i);
    await expect(subscriptionPage.statusMessage).toContainText(/already exists/i);
  });
});
