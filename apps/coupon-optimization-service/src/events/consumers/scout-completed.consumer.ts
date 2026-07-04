import { ScoutCompletedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerScoutCompletedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<ScoutCompletedEvent>("ScoutCompleted", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
