import { MenuProposedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { DispatchService } from "../../modules/dispatch/dispatch.service";

export function registerMenuProposedConsumer(subscriber: EventSubscriber, dispatch: DispatchService) {
  return subscriber.on<MenuProposedEvent>("MenuProposed", async (event) => {
    // Let a genuine dispatch failure propagate -- the message is then NOT
    // deleted from the queue and is retried after the visibility timeout.
    // In practice DispatchService.send() is designed not to throw (each
    // channel's failure is caught and recorded individually), so this is
    // defense in depth, matching escrow-service's consumer policy.
    await dispatch.send({ userId: event.userId, type: "MENU_OF_THE_DAY", proposedItems: event.proposedItems });
  });
}
