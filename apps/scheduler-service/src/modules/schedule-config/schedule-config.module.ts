import { Module } from "@nestjs/common";
import { ScheduleConfigController } from "./schedule-config.controller";
import { ScheduleConfigService } from "./schedule-config.service";

@Module({
  controllers: [ScheduleConfigController],
  providers: [ScheduleConfigService],
  exports: [ScheduleConfigService],
})
export class ScheduleConfigModule {}
