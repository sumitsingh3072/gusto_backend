import { ScoutCompletedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class ScoutCompletedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: ScoutCompletedEvent) {
    return this.bus.publish("ScoutCompleted", event);
  }
}
