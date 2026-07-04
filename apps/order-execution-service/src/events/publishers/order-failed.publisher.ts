import { OrderFailedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class OrderFailedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: OrderFailedEvent) {
    return this.bus.publish("OrderFailed", event);
  }
}
