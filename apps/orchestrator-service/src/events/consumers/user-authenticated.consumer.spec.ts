import { registerUserAuthenticatedConsumer } from "./user-authenticated.consumer";
import { EventSubscriber, EventHandler } from "@gusto/event-bus";
import { UserAuthenticatedEvent } from "@gusto/contracts";

describe("registerUserAuthenticatedConsumer", () => {
  function fakeEvent(overrides: Partial<UserAuthenticatedEvent> = {}): UserAuthenticatedEvent {
    return {
      eventId: "11111111-1111-1111-1111-111111111111",
      occurredAt: new Date().toISOString(),
      userId: "user-1",
      ...overrides,
    };
  }

  it("is intentionally inert -- resolves without throwing", async () => {
    let capturedHandler: EventHandler<UserAuthenticatedEvent> | undefined;
    const subscriber = {
      on: jest.fn((_eventType: string, handler: EventHandler<UserAuthenticatedEvent>) => {
        capturedHandler = handler;
        return Promise.resolve();
      }),
    };

    registerUserAuthenticatedConsumer(subscriber as unknown as EventSubscriber);

    await expect(capturedHandler!(fakeEvent())).resolves.toBeUndefined();
    expect(subscriber.on).toHaveBeenCalledWith("UserAuthenticated", expect.any(Function));
  });
});
