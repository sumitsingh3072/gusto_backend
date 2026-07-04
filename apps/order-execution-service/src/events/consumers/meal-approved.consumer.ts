import { MealApprovedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerMealApprovedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<MealApprovedEvent>("MealApproved", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
