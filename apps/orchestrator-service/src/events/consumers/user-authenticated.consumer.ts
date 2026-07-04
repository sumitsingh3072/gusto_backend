import { UserAuthenticatedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";

export function registerUserAuthenticatedConsumer(subscriber: EventSubscriber) {
  return subscriber.on<UserAuthenticatedEvent>("UserAuthenticated", async (event) => {
    // seed a workflow_state row / schedule config for the newly authenticated user
    throw new Error("not implemented in scaffold");
  });
}
