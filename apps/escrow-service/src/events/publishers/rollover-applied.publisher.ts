import { RolloverAppliedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class RolloverAppliedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: RolloverAppliedEvent) {
    return this.bus.publish("RolloverApplied", event);
  }
}
