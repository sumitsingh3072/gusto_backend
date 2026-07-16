import { UserAuthenticatedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";

const logger = createLogger("orchestrator-service:user-authenticated-consumer");

/**
 * Intentionally inert (same documented pattern as
 * coupon-optimization-service's scout-completed.consumer.ts). There is
 * nothing in orchestrator's own schema to seed at login time: WorkflowState
 * requires an addressId/restaurantId that don't exist until the caller
 * supplies them on POST /workflow/scout/run, and notification timing is
 * owned by scheduler-service's own ScheduleConfig, not this service. This
 * handler exists so UserAuthenticated messages are still acked off the
 * queue rather than left unhandled, without pretending to act on them.
 */
export function registerUserAuthenticatedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<UserAuthenticatedEvent>("UserAuthenticated", async (event) => {
    logger.debug(
      { eventId: event.eventId, userId: event.userId },
      "UserAuthenticated received but intentionally not acted on -- orchestrator has no " +
        "per-user schedule/address data to seed at login time yet",
    );
  });
}
