import { MealApprovedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class MealApprovedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: MealApprovedEvent) {
    return this.bus.publish("MealApproved", event);
  }
}
