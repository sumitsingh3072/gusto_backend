import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { HackerModule } from "./modules/hacker/hacker.module";

@Module({
  imports: [HackerModule],
  controllers: [HealthController],
})
export class AppModule {}
