import { MealSkippedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerMealSkippedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<MealSkippedEvent>("MealSkipped", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
