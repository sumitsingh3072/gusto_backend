-- CreateTable
CREATE TABLE "scheduler"."schedule_config" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scout_time" TIMESTAMP(3) NOT NULL,
    "notify_time" TIMESTAMP(3) NOT NULL,
    "execute_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "last_dispatched_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_config_user_id_key" ON "scheduler"."schedule_config"("user_id");
