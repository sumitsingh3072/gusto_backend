import { CartOptimizedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class CartOptimizedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: CartOptimizedEvent) {
    return this.bus.publish("CartOptimized", event);
  }
}
