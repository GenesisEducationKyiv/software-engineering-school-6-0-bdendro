-- AlterTable
ALTER TABLE "subscription_repositories" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "repositories_id_seq";
