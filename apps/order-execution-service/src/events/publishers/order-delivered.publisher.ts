import { OrderDeliveredEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class OrderDeliveredPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: OrderDeliveredEvent) {
    return this.bus.publish("OrderDelivered", event);
  }
}
