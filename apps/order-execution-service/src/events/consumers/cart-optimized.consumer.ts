import { CartOptimizedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";

const logger = createLogger("order-execution-service:cart-optimized-consumer");

// Deliberately a log-only no-op, not a placement trigger: CartOptimizedEvent
// carries no addressId/restaurantId, which Swiggy's update_food_cart/
// place_food_order require. The canonical order-placement trigger is
// POST /orders/execute, whose request body carries those extra fields (see
// prompting_docs/order-execution-service-developer-docs.md design decision
// #1). Registered (not omitted) so the queue exists and is drained, matching
// this service's published contract ("Consumes: CartOptimized"). Returns
// without throwing so a genuine SQS retry isn't triggered for a "not wired"
// condition.
export function registerCartOptimizedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<CartOptimizedEvent>("CartOptimized", async (event) => {
    logger.warn(
      { userId: event.userId },
      "received CartOptimized but this service's canonical order-placement trigger is POST /orders/execute; no-op",
    );
  });
}
