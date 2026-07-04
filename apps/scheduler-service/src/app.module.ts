import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthController } from "./health/health.controller";
import { CronModule } from "./modules/cron/cron.module";

@Module({
  imports: [ScheduleModule.forRoot(), CronModule],
  controllers: [HealthController],
})
export class AppModule {}
