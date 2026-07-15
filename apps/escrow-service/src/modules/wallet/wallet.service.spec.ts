import { ConflictException, NotFoundException } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RolloverService } from "../rollover/rollover.service";
import { BudgetUpdatedPublisher } from "../../events/publishers/budget-updated.publisher";

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub-1",
    userId: "user-1",
    totalDeposited: 350000,
    currentBalance: 350000,
    daysLeft: 30,
    dailyAvgLimit: 11666,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WalletService", () => {
  let prisma: {
    subscription: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let rolloverService: jest.Mocked<Pick<RolloverService, "redistribute">>;
  let publisher: jest.Mocked<Pick<BudgetUpdatedPublisher, "publish">>;
  let service: WalletService;

  beforeEach(() => {
    prisma = {
      subscription: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    rolloverService = { redistribute: jest.fn() };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new WalletService(
      prisma as unknown as PrismaService,
      rolloverService as unknown as RolloverService,
      publisher as unknown as BudgetUpdatedPublisher,
    );
  });

  describe("deposit", () => {
    it("upserts a fresh 30-day cycle with floor-divided dailyAvgLimit and publishes BudgetUpdated", async () => {
      const sub = makeSub();
      prisma.subscription.upsert.mockResolvedValue(sub);

      const result = await service.deposit("user-1", 350000);

      expect(prisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1", totalDeposited: 350000, currentBalance: 350000, daysLeft: 30, dailyAvgLimit: 11666 },
        update: { totalDeposited: 350000, currentBalance: 350000, daysLeft: 30, dailyAvgLimit: 11666 },
      });
      expect(result).toBe(sub);
      expect(publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", currentBalance: 350000, dailyAvgLimit: 11666 }),
      );
    });

    it("rejects a non-positive deposit amount", async () => {
      await expect(service.deposit("user-1", 0)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe("debit", () => {
    it("decrements currentBalance inside a transaction and publishes BudgetUpdated", async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 245006 }));
      prisma.subscription.update.mockResolvedValue(makeSub({ currentBalance: 233340 }));

      const result = await service.debit("user-1", 11666, 500);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { currentBalance: 233340 },
      });
      expect(result.currentBalance).toBe(233340);
      expect(publisher.publish).toHaveBeenCalledTimes(1);
    });

    it("throws ConflictException on overdraft and does not mutate", async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 5000 }));

      await expect(service.debit("user-1", 11666, 0)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it("throws NotFoundException for an unknown user", async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.debit("ghost", 100, 0)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("still returns the mutation result when publishing BudgetUpdated fails", async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 245006 }));
      prisma.subscription.update.mockResolvedValue(makeSub({ currentBalance: 233340 }));
      publisher.publish.mockRejectedValue(new Error("event bus unreachable"));

      const result = await service.debit("user-1", 11666, 0);
      expect(result.currentBalance).toBe(233340);
    });
  });

  describe("tick", () => {
    it("decrements daysLeft and recomputes dailyAvgLimit", async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 245006, daysLeft: 21 }));
      prisma.subscription.update.mockResolvedValue(makeSub({ currentBalance: 245006, daysLeft: 20, dailyAvgLimit: 12250 }));

      const result = await service.tick("user-1");

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { daysLeft: 20, dailyAvgLimit: 12250 },
      });
      expect(result.dailyAvgLimit).toBe(12250);
    });

    it("throws ConflictException when the cycle has already ended", async () => {
      prisma.subscription.findUnique.mockResolvedValue(makeSub({ daysLeft: 0 }));
      await expect(service.tick("user-1")).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe("getBalance / getSubscription", () => {
    it("returns the subscription row", async () => {
      const sub = makeSub();
      prisma.subscription.findUnique.mockResolvedValue(sub);
      await expect(service.getBalance("user-1")).resolves.toBe(sub);
      await expect(service.getSubscription("user-1")).resolves.toBe(sub);
    });

    it("throws NotFoundException for an unknown user", async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.getBalance("ghost")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("rollover", () => {
    it("delegates to RolloverService", async () => {
      rolloverService.redistribute.mockResolvedValue(makeSub() as never);
      await service.rollover("user-1");
      expect(rolloverService.redistribute).toHaveBeenCalledWith("user-1");
    });
  });
});
