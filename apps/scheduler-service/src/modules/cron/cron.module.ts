import { Module } from "@nestjs/common";
import { CohortScheduler } from "./cohort-scheduler";

@Module({
  providers: [CohortScheduler],
})
export class CronModule {}
