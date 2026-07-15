import { MealSkippedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";
import { RolloverService } from "../../modules/rollover/rollover.service";

const logger = createLogger("escrow-service:meal-skipped-consumer");

export function registerMealSkippedConsumer(subscriber: EventSubscriber, rollover: RolloverService) {
  return subscriber.on<MealSkippedEvent>("MealSkipped", async (event) => {
    await rollover.redistribute(event.userId);
    logger.info({ userId: event.userId, reason: event.reason }, "applied rollover for MealSkipped");
  });
}
