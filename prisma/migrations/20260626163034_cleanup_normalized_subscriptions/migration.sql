-- Drop constraint
ALTER TABLE "subscriptions"
  DROP CONSTRAINT "subscriptions_email_repo_key";

-- Drop columns
ALTER TABLE "subscriptions" 
  DROP COLUMN "last_seen_tag",
  DROP COLUMN "repo";
