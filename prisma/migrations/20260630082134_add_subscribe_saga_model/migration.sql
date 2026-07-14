-- CreateTable
CREATE TABLE "subscribe_sagas" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "repo_name" TEXT NOT NULL,
    "subscription_id" INTEGER,
    "repo_id" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'STARTED',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscribe_sagas_pkey" PRIMARY KEY ("id")
);
