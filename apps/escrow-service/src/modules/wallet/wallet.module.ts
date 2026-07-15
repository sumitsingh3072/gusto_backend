import { Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { RolloverModule } from "../rollover/rollover.module";
import { BudgetUpdatedPublisher } from "../../events/publishers/budget-updated.publisher";
import { env } from "../../config/configuration";

@Module({
  imports: [RolloverModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    { provide: EventPublisher, useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "escrow-service") },
    {
      provide: BudgetUpdatedPublisher,
      useFactory: (bus: EventPublisher) => new BudgetUpdatedPublisher(bus),
      inject: [EventPublisher],
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
