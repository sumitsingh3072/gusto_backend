import { OrderPlacedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { DispatchService } from "../../modules/dispatch/dispatch.service";

export function registerOrderPlacedConsumer(subscriber: EventSubscriber, dispatch: DispatchService) {
  return subscriber.on<OrderPlacedEvent>("OrderPlaced", async (event) => {
    await dispatch.send({ userId: event.userId, type: "ORDER_STATUS", orderId: event.orderId, status: "PLACED", cart: event.cart });
  });
}
