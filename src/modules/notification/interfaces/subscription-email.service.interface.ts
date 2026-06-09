export interface SubscriptionEmailServiceInterface {
  sendConfirmationEmail(to: string, token: string, repo: string): Promise<void>;
  sendConfirmationSuccessEmail(to: string, token: string, repo: string): Promise<void>;
  sendUnsubscribeSuccessEmail(to: string, repo: string): Promise<void>;
}
