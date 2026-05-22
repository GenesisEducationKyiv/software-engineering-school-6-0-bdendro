import { type Locator, type Page } from '@playwright/test';

interface SubscribeBody {
  email: string;
  repo: string;
}

export class SubscriptionPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly repoInput: Locator;
  readonly submitButton: Locator;
  readonly statusMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.getByTestId('email-input');
    this.repoInput = page.getByTestId('repo-input');
    this.submitButton = page.getByTestId('subscribe-button');
    this.statusMessage = page.getByTestId('status-message');
  }

  async goto() {
    await this.page.goto('/');
  }

  async subscribe(data: SubscribeBody) {
    await this.emailInput.fill(data.email);
    await this.repoInput.fill(data.repo);
    await this.submitButton.click();
  }
}
