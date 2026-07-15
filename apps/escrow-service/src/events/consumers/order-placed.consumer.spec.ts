import { registerOrderPlacedConsumer } from "./order-placed.consumer";
import { WalletService } from "../../modules/wallet/wallet.service";
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
        baseCost: 27000,
        fillerCost: 0,
        discountApplied: 0,
        finalTotal: 27000,
        savingsAchieved: 0,
        overBudget: false,
        decisionLog: [],
      },
      ...overrides,
    };
  }

  it("debits the wallet with the event's finalTotal and savingsAchieved", async () => {
    let capturedHandler: EventHandler<OrderPlacedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderPlacedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const wallet = { debit: jest.fn().mockResolvedValue(undefined) };

    registerOrderPlacedConsumer(subscriber as unknown as EventSubscriber, wallet as unknown as WalletService);
    const event = fakeEvent({ cart: { ...fakeEvent().cart, finalTotal: 24500, savingsAchieved: 2500 } });
    await capturedHandler!(event);

    expect(wallet.debit).toHaveBeenCalledWith("user-1", 24500, 2500);
  });

  it("propagates a debit failure instead of swallowing it", async () => {
    let capturedHandler: EventHandler<OrderPlacedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<OrderPlacedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const wallet = { debit: jest.fn().mockRejectedValue(new Error("overdraft")) };

    registerOrderPlacedConsumer(subscriber as unknown as EventSubscriber, wallet as unknown as WalletService);
    await expect(capturedHandler!(fakeEvent())).rejects.toThrow("overdraft");
  });
});
