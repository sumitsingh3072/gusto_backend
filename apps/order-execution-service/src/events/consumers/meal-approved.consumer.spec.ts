import { registerMealApprovedConsumer } from "./meal-approved.consumer";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { MealApprovedEvent } from "@gusto/contracts";

describe("registerMealApprovedConsumer", () => {
  it("logs and returns without throwing (no-op, canonical trigger is POST /orders/execute)", async () => {
    let capturedHandler: EventHandler<MealApprovedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<MealApprovedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };

    registerMealApprovedConsumer(subscriber as unknown as EventSubscriber);

    await expect(
      capturedHandler!({
        eventId: "11111111-1111-1111-1111-111111111111",
        occurredAt: new Date().toISOString(),
        userId: "user-1",
        itemId: "item-1",
        restaurantId: "rest-1",
        price: 20000,
        name: "Paneer Tikka",
      }),
    ).resolves.toBeUndefined();
  });
});
