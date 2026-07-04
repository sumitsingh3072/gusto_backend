import { OrderDeliveredEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerOrderDeliveredConsumer(subscriber: EventSubscriber) {
  return subscriber.on<OrderDeliveredEvent>("OrderDelivered", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
