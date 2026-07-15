import { registerOrderPlacedConsumer } from "./order-placed.consumer";
import { DispatchService } from "../../modules/dispatch/dispatch.service";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { OrderPlacedEvent } from "@gusto/contracts";

describe("registerOrderPlacedConsumer", () => {
  function fakeEvent(overrides: Partial<OrderPlacedEvent> = {}): OrderPlacedEvent {
    return {
      eventId: "11111111-1111-1111-1111-111111111111",
      occurredAt: new Date().toISOString(),
      userId: "user-1",
      orderId: "order-1",
      cart: {
        items: [],
        baseCost: 20000,
        fillerCost: 0,
        discountApplied: 0,
        finalTotal: 20000,
        savingsAchieved: 0,
        overBudget: false,
        decisionLog: [],
      },
      ...overrides,
    };
  }

  it("dispatches an ORDER_STATUS/PLACED notification", async () => {
    let capturedHandler: EventHandler<OrderPlacedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderPlacedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockResolvedValue(undefined) };

    registerOrderPlacedConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    const event = fakeEvent();
    await capturedHandler!(event);

    expect(dispatch.send).toHaveBeenCalledWith({
      userId: "user-1",
      type: "ORDER_STATUS",
      orderId: "order-1",
      status: "PLACED",
      cart: event.cart,
    });
  });

  it("propagates a dispatch failure instead of swallowing it", async () => {
    let capturedHandler: EventHandler<OrderPlacedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderPlacedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockRejectedValue(new Error("dispatch failed")) };

    registerOrderPlacedConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    await expect(capturedHandler!(fakeEvent())).rejects.toThrow("dispatch failed");
  });
});
