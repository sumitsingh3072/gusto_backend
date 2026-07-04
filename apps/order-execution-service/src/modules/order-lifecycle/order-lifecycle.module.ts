import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { ConfirmationGateModule } from "../confirmation-gate/confirmation-gate.module";

@Module({
  imports: [ConfirmationGateModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderLifecycleModule {}
