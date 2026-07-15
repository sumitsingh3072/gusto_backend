import { registerOrderDeliveredConsumer } from "./order-delivered.consumer";
import { DispatchService } from "../../modules/dispatch/dispatch.service";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { OrderDeliveredEvent } from "@gusto/contracts";

describe("registerOrderDeliveredConsumer", () => {
  function fakeEvent(overrides: Partial<OrderDeliveredEvent> = {}): OrderDeliveredEvent {
    return {
      eventId: "11111111-1111-1111-1111-111111111111",
      occurredAt: new Date().toISOString(),
      userId: "user-1",
      orderId: "order-1",
      ...overrides,
    };
  }

  it("dispatches an ORDER_STATUS/DELIVERED notification", async () => {
    let capturedHandler: EventHandler<OrderDeliveredEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderDeliveredEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockResolvedValue(undefined) };

    registerOrderDeliveredConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    await capturedHandler!(fakeEvent());

    expect(dispatch.send).toHaveBeenCalledWith({
      userId: "user-1",
      type: "ORDER_STATUS",
      orderId: "order-1",
      status: "DELIVERED",
    });
  });

  it("propagates a dispatch failure instead of swallowing it", async () => {
    let capturedHandler: EventHandler<OrderDeliveredEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderDeliveredEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockRejectedValue(new Error("dispatch failed")) };

    registerOrderDeliveredConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    await expect(capturedHandler!(fakeEvent())).rejects.toThrow("dispatch failed");
  });
});
