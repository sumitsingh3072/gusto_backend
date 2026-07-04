import { CartOptimizedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerCartOptimizedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<CartOptimizedEvent>("CartOptimized", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
