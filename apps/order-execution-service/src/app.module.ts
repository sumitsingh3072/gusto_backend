import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { OrderLifecycleModule } from "./modules/order-lifecycle/order-lifecycle.module";
import { ConfirmationGateModule } from "./modules/confirmation-gate/confirmation-gate.module";
import { PrismaModule } from "./prisma/prisma.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [PrismaModule, OrderLifecycleModule, ConfirmationGateModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
