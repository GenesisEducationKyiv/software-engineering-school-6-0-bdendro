export interface SubscriptionNotificationSenderInterface {
  sendConfirmationNotification(to: string, confirmationUrl: string, repo: string): Promise<void>;
  sendConfirmationSuccessNotification(
    to: string,
    unsubscribeUrl: string,
    repo: string,
  ): Promise<void>;
  sendUnsubscribeSuccessNotification(to: string, repo: string): Promise<void>;
}
