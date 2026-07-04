import { OrderPlacedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerOrderPlacedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<OrderPlacedEvent>("OrderPlaced", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
