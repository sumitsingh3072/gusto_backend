import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { HackerModule } from "./modules/hacker/hacker.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [HackerModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
