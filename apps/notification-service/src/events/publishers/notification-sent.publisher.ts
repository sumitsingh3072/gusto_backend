import { NotificationSentEvent } from "@gusto/contracts";
import { EventPublisher } from "@gusto/event-bus";

export class NotificationSentPublisher {
  constructor(private readonly bus: EventPublisher) {}
  publish(event: NotificationSentEvent) {
    return this.bus.publish("NotificationSent", event);
  }
}
