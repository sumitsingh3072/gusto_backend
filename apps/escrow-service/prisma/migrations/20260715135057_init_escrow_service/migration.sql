-- CreateTable
CREATE TABLE "escrow"."subscriptions" (
    "sub_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_deposited" INTEGER NOT NULL,
    "current_balance" INTEGER NOT NULL,
    "days_left" INTEGER NOT NULL,
    "daily_avg_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("sub_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "escrow"."subscriptions"("user_id");
