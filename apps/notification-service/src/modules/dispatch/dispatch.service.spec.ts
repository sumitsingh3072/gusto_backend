import { BadRequestException } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";
import { SnsAdapter } from "./sns.adapter";
import { SesAdapter } from "./ses.adapter";
import { PrismaService } from "../../prisma/prisma.service";
import { ContactPreferenceService } from "../contact-preference/contact-preference.service";
import { NotificationSentPublisher } from "../../events/publishers/notification-sent.publisher";

function makeContact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "contact-1",
    userId: "user-1",
    email: null,
    phone: null,
    pushToken: null,
    pushPlatform: null,
    pushEndpointArn: null,
    emailOptOut: false,
    pushOptOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("DispatchService", () => {
  let sns: jest.Mocked<Pick<SnsAdapter, "createEndpoint" | "publish">>;
  let ses: jest.Mocked<Pick<SesAdapter, "sendEmail">>;
  let prisma: { notificationLog: { create: jest.Mock } };
  let contactPreference: jest.Mocked<Pick<ContactPreferenceService, "findOrNull" | "setPushEndpointArn">>;
  let publisher: jest.Mocked<Pick<NotificationSentPublisher, "publish">>;
  let service: DispatchService;

  beforeEach(() => {
    sns = { createEndpoint: jest.fn(), publish: jest.fn().mockResolvedValue(undefined) };
    ses = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    prisma = { notificationLog: { create: jest.fn().mockResolvedValue({}) } };
    contactPreference = { findOrNull: jest.fn(), setPushEndpointArn: jest.fn().mockResolvedValue(undefined) };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new DispatchService(
      sns as unknown as SnsAdapter,
      ses as unknown as SesAdapter,
      prisma as unknown as PrismaService,
      contactPreference as unknown as ContactPreferenceService,
      publisher as unknown as NotificationSentPublisher,
    );
  });

  it("rejects an unknown notification type", async () => {
    await expect(service.send({ userId: "user-1", type: "BOGUS" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("dispatches nothing (no throw) when no contact preference exists", async () => {
    contactPreference.findOrNull.mockResolvedValue(null);
    const result = await service.send({ userId: "user-1", type: "MENU_OF_THE_DAY" });
    expect(result.dispatched).toEqual([]);
    expect(ses.sendEmail).not.toHaveBeenCalled();
    expect(sns.publish).not.toHaveBeenCalled();
  });

  it("dispatches email only when only email is on file", async () => {
    contactPreference.findOrNull.mockResolvedValue(makeContact({ email: "a@b.com" }));
    const result = await service.send({ userId: "user-1", type: "MENU_OF_THE_DAY" });

    expect(ses.sendEmail).toHaveBeenCalledWith("a@b.com", expect.any(String), expect.any(String));
    expect(sns.publish).not.toHaveBeenCalled();
    expect(result.dispatched).toEqual([{ channel: "email", success: true }]);
    expect(prisma.notificationLog.create).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it("dispatches both channels when both email and push token are on file, creating an SNS endpoint lazily", async () => {
    contactPreference.findOrNull.mockResolvedValue(
      makeContact({ email: "a@b.com", pushToken: "tok-1", pushPlatform: "ios" }),
    );
    sns.createEndpoint.mockResolvedValue("arn:aws:sns:endpoint-1");

    const result = await service.send({ userId: "user-1", type: "ORDER_STATUS", orderId: "order-1", status: "PLACED" });

    expect(ses.sendEmail).toHaveBeenCalledTimes(1);
    expect(sns.createEndpoint).toHaveBeenCalledWith("arn:aws:sns:platform-ios", "tok-1");
    expect(contactPreference.setPushEndpointArn).toHaveBeenCalledWith("user-1", "arn:aws:sns:endpoint-1");
    expect(sns.publish).toHaveBeenCalledWith("arn:aws:sns:endpoint-1", expect.objectContaining({ orderId: "order-1" }));
    expect(result.dispatched).toEqual([
      { channel: "email", success: true },
      { channel: "push", success: true },
    ]);
    expect(prisma.notificationLog.create).toHaveBeenCalledTimes(2);
  });

  it("reuses an already-cached SNS endpoint instead of recreating it", async () => {
    contactPreference.findOrNull.mockResolvedValue(
      makeContact({ pushToken: "tok-1", pushPlatform: "android", pushEndpointArn: "arn:aws:sns:cached" }),
    );

    await service.send({ userId: "user-1", type: "ORDER_STATUS", orderId: "order-1" });

    expect(sns.createEndpoint).not.toHaveBeenCalled();
    expect(sns.publish).toHaveBeenCalledWith("arn:aws:sns:cached", expect.any(Object));
  });

  it("does not opt-out channels: emailOptOut suppresses email even when email is on file", async () => {
    contactPreference.findOrNull.mockResolvedValue(makeContact({ email: "a@b.com", emailOptOut: true }));
    const result = await service.send({ userId: "user-1", type: "MENU_OF_THE_DAY" });
    expect(ses.sendEmail).not.toHaveBeenCalled();
    expect(result.dispatched).toEqual([]);
  });

  it("records one channel's failure without blocking the other", async () => {
    contactPreference.findOrNull.mockResolvedValue(
      makeContact({ email: "a@b.com", pushToken: "tok-1", pushPlatform: "ios", pushEndpointArn: "arn:aws:sns:cached" }),
    );
    ses.sendEmail.mockRejectedValue(new Error("SES unreachable"));

    const result = await service.send({ userId: "user-1", type: "MENU_OF_THE_DAY" });

    expect(result.dispatched).toEqual([
      { channel: "email", success: false, error: "SES unreachable" },
      { channel: "push", success: true },
    ]);
  });
});
