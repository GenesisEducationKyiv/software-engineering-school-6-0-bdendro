ALTER TABLE "repositories" RENAME TO "subscription_repositories";

ALTER TABLE "subscription_repositories"
    RENAME CONSTRAINT "repositories_pkey" TO "subscription_repositories_pkey";

ALTER TABLE "subscription_repositories"
    RENAME CONSTRAINT "repositories_repo_name_key" TO "subscription_repositories_repo_name_key";

-- CreateTable
CREATE TABLE "repositories" ( 
  "id" SERIAL NOT NULL,
  "repo_name" TEXT NOT NULL,
  "last_seen_tag" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "repositories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "repositories_repo_name_key" UNIQUE ("repo_name")
);
