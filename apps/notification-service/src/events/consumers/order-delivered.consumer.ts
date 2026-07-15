import { OrderDeliveredEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { DispatchService } from "../../modules/dispatch/dispatch.service";

export function registerOrderDeliveredConsumer(subscriber: EventSubscriber, dispatch: DispatchService) {
  return subscriber.on<OrderDeliveredEvent>("OrderDelivered", async (event) => {
    await dispatch.send({ userId: event.userId, type: "ORDER_STATUS", orderId: event.orderId, status: "DELIVERED" });
  });
}
