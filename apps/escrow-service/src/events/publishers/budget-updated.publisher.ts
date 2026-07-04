import { BudgetUpdatedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class BudgetUpdatedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: BudgetUpdatedEvent) {
    return this.bus.publish("BudgetUpdated", event);
  }
}
