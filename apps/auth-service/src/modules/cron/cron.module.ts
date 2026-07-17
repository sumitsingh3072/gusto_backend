import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SessionCleanupService } from "./session-cleanup.service";
import { OAuthModule } from "../oauth/oauth.module";

@Module({
  imports: [ScheduleModule.forRoot(), OAuthModule],
  providers: [SessionCleanupService],
})
export class CronModule {}
