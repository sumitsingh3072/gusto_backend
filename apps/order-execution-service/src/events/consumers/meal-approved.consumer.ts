import { MealApprovedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";

const logger = createLogger("order-execution-service:meal-approved-consumer");

// Deliberately a log-only no-op: MealApprovedEvent is a single-item shape
// (itemId/restaurantId/price/name), not a cart -- it cannot drive
// populateAndAwaitConfirmation() without synthesizing an OptimizedCart from
// incomplete data. The canonical order-placement trigger is
// POST /orders/execute (see cart-optimized.consumer.ts for the fuller
// reasoning, same design decision applies here).
export function registerMealApprovedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<MealApprovedEvent>("MealApproved", async (event) => {
    logger.warn(
      { userId: event.userId, itemId: event.itemId },
      "received MealApproved but this service's canonical order-placement trigger is POST /orders/execute; no-op",
    );
  });
}
