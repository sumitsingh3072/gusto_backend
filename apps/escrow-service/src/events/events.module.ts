import { Module, OnModuleInit } from "@nestjs/common";
import { EventSubscriber } from "@gusto/event-bus";
import { registerOrderPlacedConsumer } from "./consumers/order-placed.consumer";
import { registerMealSkippedConsumer } from "./consumers/meal-skipped.consumer";
import { env } from "../config/configuration";
import { WalletModule } from "../modules/wallet/wallet.module";
import { RolloverModule } from "../modules/rollover/rollover.module";
import { WalletService } from "../modules/wallet/wallet.service";
import { RolloverService } from "../modules/rollover/rollover.service";

// Two separate EventSubscriber instances, one per queue -- EventSubscriber
// only drives one event type per instance (subscriber.on() is a no-op on a
// second call), so OrderPlaced and MealSkipped each need their own queue.
@Module({ imports: [WalletModule, RolloverModule] })
export class EventsModule implements OnModuleInit {
  constructor(
    private readonly wallet: WalletService,
    private readonly rollover: RolloverService,
  ) {}

  onModuleInit() {
    registerOrderPlacedConsumer(new EventSubscriber(env.ESCROW_ORDER_PLACED_QUEUE_URL), this.wallet);
    registerMealSkippedConsumer(new EventSubscriber(env.ESCROW_MEAL_SKIPPED_QUEUE_URL), this.rollover);
  }
}
