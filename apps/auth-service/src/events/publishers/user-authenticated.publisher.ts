import { UserAuthenticatedEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class UserAuthenticatedPublisher {
  constructor(private readonly bus: EventPublisher) {}

  publish(event: UserAuthenticatedEvent) {
    return this.bus.publish("UserAuthenticated", event);
  }
}
