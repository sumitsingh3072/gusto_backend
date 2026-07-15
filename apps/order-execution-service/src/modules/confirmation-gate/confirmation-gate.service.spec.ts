import { NotFoundException } from "@nestjs/common";
import { ConfirmationGateService } from "./confirmation-gate.service";
import { NotificationClient } from "../../clients/notification.client";
import { PrismaService } from "../../prisma/prisma.service";

describe("ConfirmationGateService", () => {
  let notification: jest.Mocked<Pick<NotificationClient, "requestConfirmation">>;
  let prisma: { order: { findUnique: jest.Mock } };
  let service: ConfirmationGateService;

  beforeEach(() => {
    notification = { requestConfirmation: jest.fn().mockResolvedValue(undefined) };
    prisma = { order: { findUnique: jest.fn() } };
    service = new ConfirmationGateService(
      notification as unknown as NotificationClient,
      prisma as unknown as PrismaService,
    );
  });

  describe("requestConfirmation", () => {
    it("calls NotificationClient.requestConfirmation", async () => {
      await service.requestConfirmation("order-1", "user-1");
      expect(notification.requestConfirmation).toHaveBeenCalledWith("user-1", "order-1");
    });

    it("does not throw when the notification call fails (fire-and-forget)", async () => {
      notification.requestConfirmation.mockRejectedValue(new Error("notification-service unreachable"));
      await expect(service.requestConfirmation("order-1", "user-1")).resolves.toBeUndefined();
    });
  });

  describe("isConfirmed", () => {
    it("returns false while the order is still PENDING_CONFIRMATION", async () => {
      prisma.order.findUnique.mockResolvedValue({ status: "PENDING_CONFIRMATION" });
      await expect(service.isConfirmed("order-1")).resolves.toBe(false);
    });

    it("returns true once the order has moved past PENDING_CONFIRMATION", async () => {
      prisma.order.findUnique.mockResolvedValue({ status: "PLACED" });
      await expect(service.isConfirmed("order-1")).resolves.toBe(true);
    });

    it("404s for an unknown order", async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.isConfirmed("ghost")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
