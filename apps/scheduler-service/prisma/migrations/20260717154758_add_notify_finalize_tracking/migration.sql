-- AlterTable
ALTER TABLE "scheduler"."schedule_config" ADD COLUMN     "last_finalized_date" TIMESTAMP(3),
ADD COLUMN     "last_notified_date" TIMESTAMP(3);
