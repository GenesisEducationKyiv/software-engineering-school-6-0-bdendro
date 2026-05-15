ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_token_key"
  UNIQUE USING INDEX "subscriptions_token_key";

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_email_repo_key"
  UNIQUE USING INDEX "subscriptions_email_repo_key";
  