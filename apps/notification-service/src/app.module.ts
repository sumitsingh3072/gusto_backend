import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { InboundModule } from "./modules/inbound/inbound.module";

@Module({
  imports: [DispatchModule, InboundModule],
  controllers: [HealthController],
})
export class AppModule {}
