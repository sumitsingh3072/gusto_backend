import { NotFoundException } from "@nestjs/common";
import { RolloverService } from "./rollover.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RolloverAppliedPublisher } from "../../events/publishers/rollover-applied.publisher";

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub-1",
    userId: "user-1",
    totalDeposited: 350000,
    currentBalance: 245006,
    daysLeft: 21,
    dailyAvgLimit: 11667,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("RolloverService", () => {
  let prisma: {
    subscription: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let publisher: jest.Mocked<Pick<RolloverAppliedPublisher, "publish">>;
  let service: RolloverService;

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new RolloverService(prisma as unknown as PrismaService, publisher as unknown as RolloverAppliedPublisher);
  });

  it("worked example: recomputes dailyAvgLimit over remaining daysLeft and publishes RolloverApplied", async () => {
    prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 245006, daysLeft: 21, dailyAvgLimit: 11667 }));
    prisma.subscription.update.mockResolvedValue(makeSub({ currentBalance: 245006, daysLeft: 21, dailyAvgLimit: 11666 }));

    const result = await service.redistribute("user-1");

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { dailyAvgLimit: 11666 }, // floor(245006 / 21)
    });
    expect(result.dailyAvgLimit).toBe(11666);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", rolloverAmount: 11667, newDailyLimit: 11666 }),
    );
  });

  it("guards div-by-zero by flooring daysLeft at 1", async () => {
    prisma.subscription.findUnique.mockResolvedValue(makeSub({ currentBalance: 12250, daysLeft: 0, dailyAvgLimit: 12250 }));
    prisma.subscription.update.mockResolvedValue(makeSub({ currentBalance: 12250, daysLeft: 0, dailyAvgLimit: 12250 }));

    await service.redistribute("user-1");

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { dailyAvgLimit: 12250 }, // floor(12250 / max(0,1))
    });
  });

  it("throws NotFoundException for an unknown user", async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await expect(service.redistribute("ghost")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("still returns the recompute result when publishing RolloverApplied fails", async () => {
    prisma.subscription.findUnique.mockResolvedValue(makeSub());
    prisma.subscription.update.mockResolvedValue(makeSub());
    publisher.publish.mockRejectedValue(new Error("event bus unreachable"));

    const result = await service.redistribute("user-1");
    expect(result).toBeDefined();
  });
});
