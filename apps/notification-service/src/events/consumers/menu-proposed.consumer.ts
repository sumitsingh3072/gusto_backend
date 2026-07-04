import { MenuProposedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerMenuProposedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<MenuProposedEvent>("MenuProposed", async (event) => {
    throw new Error("not implemented in scaffold");
  });
}
