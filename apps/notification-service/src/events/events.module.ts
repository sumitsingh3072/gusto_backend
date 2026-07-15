import { Module, OnModuleInit } from "@nestjs/common";
import { EventSubscriber } from "@gusto/event-bus";
import { registerMenuProposedConsumer } from "./consumers/menu-proposed.consumer";
import { registerOrderPlacedConsumer } from "./consumers/order-placed.consumer";
import { registerOrderDeliveredConsumer } from "./consumers/order-delivered.consumer";
import { env } from "../config/configuration";
import { DispatchModule } from "../modules/dispatch/dispatch.module";
import { DispatchService } from "../modules/dispatch/dispatch.service";

// Three separate EventSubscriber instances, one per queue -- EventSubscriber
// only drives one event type per instance (subscriber.on() is a no-op on a
// second call), so each event type needs its own queue.
@Module({ imports: [DispatchModule] })
export class EventsModule implements OnModuleInit {
  constructor(private readonly dispatch: DispatchService) {}

  onModuleInit() {
    registerMenuProposedConsumer(new EventSubscriber(env.NOTIFICATION_MENU_PROPOSED_QUEUE_URL), this.dispatch);
    registerOrderPlacedConsumer(new EventSubscriber(env.NOTIFICATION_ORDER_PLACED_QUEUE_URL), this.dispatch);
    registerOrderDeliveredConsumer(new EventSubscriber(env.NOTIFICATION_ORDER_DELIVERED_QUEUE_URL), this.dispatch);
  }
}
