import type { APIRequestContext } from '@playwright/test';

interface MailpitAddress {
  Address: string;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: MailpitAddress[];
  Snippet: string;
}

interface MailpitMessagesResponse {
  messages: MailpitMessage[];
  total: number;
  unread: number;
}

interface WaitForMessageOptions {
  to?: string;
  subject?: RegExp;
  timeoutMs?: number;
  intervalMs?: number;
}

export class MailpitClient {
  constructor(
    private readonly baseUrl: string,
    private readonly request: APIRequestContext,
  ) {}

  async clear(): Promise<void> {
    const response = await this.request.delete(`${this.baseUrl}/api/v1/messages`);

    if (!response.ok()) {
      throw new Error(`Failed to clear Mailpit messages. Status: ${response.status()}`);
    }
  }

  async getMessages(): Promise<MailpitMessage[]> {
    const response = await this.request.get(`${this.baseUrl}/api/v1/messages`);

    if (!response.ok()) {
      throw new Error(`Failed to get Mailpit messages. Status: ${response.status()}`);
    }

    const body = (await response.json()) as MailpitMessagesResponse;
    return body.messages;
  }

  async countMessages(): Promise<number> {
    const messages = await this.getMessages();
    return messages.length;
  }

  async waitForMessage(options: WaitForMessageOptions = {}): Promise<MailpitMessage> {
    const timeoutMs = options.timeoutMs ?? 5000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const messages = await this.getMessages();
      const message = messages.find((message) => this.matchesMessage(message, options));

      if (message) return message;

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error('Expected email was not received by Mailpit');
  }

  private matchesMessage(message: MailpitMessage, options: WaitForMessageOptions): boolean {
    if (options.to && !this.hasRecipient(message, options.to)) {
      return false;
    }

    if (options.subject && !this.matchesSubject(message.Subject, options.subject)) {
      return false;
    }

    return true;
  }

  private hasRecipient(message: MailpitMessage, email: string): boolean {
    return message.To.some((recipient) => recipient.Address.toLowerCase() === email.toLowerCase());
  }

  private matchesSubject(actualSubject: string, expectedSubject: string | RegExp): boolean {
    if (typeof expectedSubject === 'string') {
      return actualSubject.includes(expectedSubject);
    }

    return expectedSubject.test(actualSubject);
  }
}
