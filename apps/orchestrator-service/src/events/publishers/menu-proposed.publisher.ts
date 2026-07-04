import { MenuProposedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class MenuProposedPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: MenuProposedEvent) {
    return this.bus.publish("MenuProposed", event);
  }
}
