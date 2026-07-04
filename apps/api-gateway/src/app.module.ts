import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { RoutingModule } from "./routing/routing.module";

@Module({
  imports: [RoutingModule],
  controllers: [HealthController],
})
export class AppModule {}
