import { registerMealSkippedConsumer } from "./meal-skipped.consumer";
import { RolloverService } from "../../modules/rollover/rollover.service";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { MealSkippedEvent } from "@gusto/contracts";

describe("registerMealSkippedConsumer", () => {
  function fakeEvent(overrides: Partial<MealSkippedEvent> = {}): MealSkippedEvent {
    return {
      eventId: "22222222-2222-2222-2222-222222222222",
      occurredAt: new Date().toISOString(),
      userId: "user-1",
      ...overrides,
    };
  }

  it("triggers rollover redistribution for the event's userId", async () => {
    let capturedHandler: EventHandler<MealSkippedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<MealSkippedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const rollover = { redistribute: jest.fn().mockResolvedValue(undefined) };

    registerMealSkippedConsumer(subscriber as unknown as EventSubscriber, rollover as unknown as RolloverService);
    await capturedHandler!(fakeEvent({ userId: "user-2" }));

    expect(rollover.redistribute).toHaveBeenCalledWith("user-2");
  });

  it("propagates a redistribution failure instead of swallowing it", async () => {
    let capturedHandler: EventHandler<MealSkippedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<MealSkippedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };
    const rollover = { redistribute: jest.fn().mockRejectedValue(new Error("no subscription")) };

    registerMealSkippedConsumer(subscriber as unknown as EventSubscriber, rollover as unknown as RolloverService);
    await expect(capturedHandler!(fakeEvent())).rejects.toThrow("no subscription");
  });
});
