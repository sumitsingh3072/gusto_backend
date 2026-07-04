import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { OrderLifecycleModule } from "./modules/order-lifecycle/order-lifecycle.module";
import { ConfirmationGateModule } from "./modules/confirmation-gate/confirmation-gate.module";

@Module({
  imports: [OrderLifecycleModule, ConfirmationGateModule],
  controllers: [HealthController],
})
export class AppModule {}
