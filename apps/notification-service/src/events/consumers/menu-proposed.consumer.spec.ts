import { registerMenuProposedConsumer } from "./menu-proposed.consumer";
import { DispatchService } from "../../modules/dispatch/dispatch.service";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { MenuProposedEvent } from "@gusto/contracts";

describe("registerMenuProposedConsumer", () => {
  function fakeEvent(overrides: Partial<MenuProposedEvent> = {}): MenuProposedEvent {
    return {
      eventId: "11111111-1111-1111-1111-111111111111",
      occurredAt: new Date().toISOString(),
      userId: "user-1",
      proposedItems: [],
      ...overrides,
    };
  }

  it("dispatches a MENU_OF_THE_DAY notification with the proposed items", async () => {
    let capturedHandler: EventHandler<MenuProposedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<MenuProposedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockResolvedValue(undefined) };

    registerMenuProposedConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    const items = [{ itemId: "item-1", restaurantId: "rest-1", name: "Paneer Tikka", price: 20000 }];
    await capturedHandler!(fakeEvent({ proposedItems: items }));

    expect(dispatch.send).toHaveBeenCalledWith({ userId: "user-1", type: "MENU_OF_THE_DAY", proposedItems: items });
  });

  it("propagates a dispatch failure instead of swallowing it", async () => {
    let capturedHandler: EventHandler<MenuProposedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<MenuProposedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const dispatch = { send: jest.fn().mockRejectedValue(new Error("dispatch failed")) };

    registerMenuProposedConsumer(subscriber as unknown as EventSubscriber, dispatch as unknown as DispatchService);
    await expect(capturedHandler!(fakeEvent())).rejects.toThrow("dispatch failed");
  });
});
