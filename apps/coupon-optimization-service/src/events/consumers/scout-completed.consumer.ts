import { ScoutCompletedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service:scout-completed-consumer");

/**
 * Intentionally inert. ScoutCompletedEvent only carries
 * {eventId, occurredAt, userId} -- no shortlist/cart data -- so it can't
 * drive the optimization algorithm. This service's real trigger is the
 * synchronous POST /optimize/cart call from orchestrator-service (see
 * coupon-optimization-implementation-plan.md, Assumption 1). This handler
 * exists so ScoutCompleted messages are still acked/consumed off the
 * queue rather than left unhandled, without pretending to act on them.
 */
export function registerScoutCompletedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<ScoutCompletedEvent>("ScoutCompleted", async (event) => {
    logger.debug(
      { eventId: event.eventId, userId: event.userId },
      "ScoutCompleted received but intentionally not acted on -- this service's " +
        "real trigger is POST /optimize/cart from orchestrator-service",
    );
  });
}
