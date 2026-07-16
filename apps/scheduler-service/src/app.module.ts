import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthController } from "./health/health.controller";
import { CronModule } from "./modules/cron/cron.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ScheduleConfigModule } from "./modules/schedule-config/schedule-config.module";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, ScheduleConfigModule, CronModule],
  controllers: [HealthController],
})
export class AppModule {}
