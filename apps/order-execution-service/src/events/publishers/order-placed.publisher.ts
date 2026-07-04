import { OrderPlacedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class OrderPlacedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: OrderPlacedEvent) {
    return this.bus.publish("OrderPlaced", event);
  }
}
