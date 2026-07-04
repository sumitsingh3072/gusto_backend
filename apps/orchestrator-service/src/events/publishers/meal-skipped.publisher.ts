import { MealSkippedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class MealSkippedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: MealSkippedEvent) {
    return this.bus.publish("MealSkipped", event);
  }
}
