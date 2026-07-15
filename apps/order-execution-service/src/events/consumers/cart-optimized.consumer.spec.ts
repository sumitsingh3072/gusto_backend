import { registerCartOptimizedConsumer } from "./cart-optimized.consumer";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { CartOptimizedEvent } from "@gusto/contracts";

describe("registerCartOptimizedConsumer", () => {
  it("logs and returns without throwing (no-op, canonical trigger is POST /orders/execute)", async () => {
    let capturedHandler: EventHandler<CartOptimizedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<CartOptimizedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };

    registerCartOptimizedConsumer(subscriber as unknown as EventSubscriber);

    await expect(
      capturedHandler!({
        eventId: "11111111-1111-1111-1111-111111111111",
        occurredAt: new Date().toISOString(),
        userId: "user-1",
        optimizedCart: {
          items: [],
          baseCost: 0,
          fillerCost: 0,
          discountApplied: 0,
          finalTotal: 0,
          savingsAchieved: 0,
          overBudget: false,
          decisionLog: [],
        },
      }),
    ).resolves.toBeUndefined();
  });
});
