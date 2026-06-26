-- Add nullable FK column
ALTER TABLE "subscriptions" 
ADD COLUMN "repository_id" INTEGER;

-- Create repositories table
CREATE TABLE "repositories" ( 
  "id" SERIAL NOT NULL,
  "repo_name" TEXT NOT NULL,
  "last_seen_tag" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "repositories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "repositories_repo_name_key" UNIQUE ("repo_name")
);

-- Extract and migrate unique repos
INSERT INTO "repositories" ("repo_name", "last_seen_tag")
SELECT DISTINCT "repo", "last_seen_tag" FROM "subscriptions";

-- Link subscriptions to repositories
UPDATE "subscriptions" s
SET "repository_id" = r."id"
FROM "repositories" r
WHERE s."repo" = r."repo_name";

-- Make FK mandatory
ALTER TABLE "subscriptions" ALTER COLUMN "repository_id" SET NOT NULL;

-- Add unique constraint (email + repository_id)
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_email_repository_id_key"
  UNIQUE ("email", "repository_id");

-- Add physical FK constraint
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
