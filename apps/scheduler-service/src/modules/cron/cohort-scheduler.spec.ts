import { CohortScheduler } from "./cohort-scheduler";
import { OrchestratorClient } from "../../clients/orchestrator.client";
import { AuthClient } from "../../clients/auth.client";
import { PrismaService } from "../../prisma/prisma.service";

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "row-1",
    userId: "user-1",
    scoutTime: new Date(Date.UTC(2000, 0, 1, 10, 0, 0)), // 10:00 UTC daily
    notifyTime: new Date(Date.UTC(2000, 0, 1, 11, 0, 0)),
    executeTime: new Date(Date.UTC(2000, 0, 1, 11, 30, 0)),
    timezone: "Asia/Kolkata",
    lastDispatchedDate: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("CohortScheduler", () => {
  let prisma: { scheduleConfig: { findMany: jest.Mock; update: jest.Mock } };
  let orchestrator: jest.Mocked<Pick<OrchestratorClient, "triggerScoutRun">>;
  let auth: jest.Mocked<Pick<AuthClient, "getPreferenceProfile">>;
  let scheduler: CohortScheduler;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 6, 16, 10, 5, 0))); // 10:05 UTC -- past scoutTime
    prisma = { scheduleConfig: { findMany: jest.fn(), update: jest.fn() } };
    orchestrator = { triggerScoutRun: jest.fn().mockResolvedValue(undefined) };
    auth = { getPreferenceProfile: jest.fn() };
    scheduler = new CohortScheduler(
      orchestrator as unknown as OrchestratorClient,
      auth as unknown as AuthClient,
      prisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("dispatches a due, undispatched row with a complete preference profile", async () => {
    prisma.scheduleConfig.findMany.mockResolvedValue([makeRow()]);
    auth.getPreferenceProfile.mockResolvedValue({
      userId: "user-1",
      prefProfile: {
        diet: "veg",
        spiceLevel: 3,
        cuisineFavorites: [],
        defaultAddressId: "addr-1",
        defaultRestaurantId: "rest-1",
      },
    });

    await scheduler.dispatchDueCohorts();

    expect(orchestrator.triggerScoutRun).toHaveBeenCalledWith("user-1", "addr-1", "rest-1");
    expect(prisma.scheduleConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "row-1" }, data: expect.objectContaining({ lastDispatchedDate: expect.any(Date) }) }),
    );
  });

  it("skips a row whose scoutTime has not arrived yet", async () => {
    prisma.scheduleConfig.findMany.mockResolvedValue([
      makeRow({ scoutTime: new Date(Date.UTC(2000, 0, 1, 23, 0, 0)) }), // 23:00 UTC, later than current 10:05
    ]);

    await scheduler.dispatchDueCohorts();

    expect(auth.getPreferenceProfile).not.toHaveBeenCalled();
    expect(orchestrator.triggerScoutRun).not.toHaveBeenCalled();
  });

  it("skips a row with no default address/restaurant on file, without throwing", async () => {
    prisma.scheduleConfig.findMany.mockResolvedValue([makeRow()]);
    auth.getPreferenceProfile.mockResolvedValue({
      userId: "user-1",
      prefProfile: { diet: "veg", spiceLevel: 3, cuisineFavorites: [] },
    });

    await scheduler.dispatchDueCohorts();

    expect(orchestrator.triggerScoutRun).not.toHaveBeenCalled();
    expect(prisma.scheduleConfig.update).not.toHaveBeenCalled();
  });

  it("isolates a failure in one row so other rows still dispatch", async () => {
    prisma.scheduleConfig.findMany.mockResolvedValue([
      makeRow({ id: "row-1", userId: "user-1" }),
      makeRow({ id: "row-2", userId: "user-2" }),
    ]);
    auth.getPreferenceProfile.mockResolvedValue({
      userId: "user-1",
      prefProfile: {
        diet: "veg",
        spiceLevel: 3,
        cuisineFavorites: [],
        defaultAddressId: "addr-1",
        defaultRestaurantId: "rest-1",
      },
    });
    orchestrator.triggerScoutRun
      .mockRejectedValueOnce(new Error("orchestrator unreachable"))
      .mockResolvedValueOnce(undefined);

    await expect(scheduler.dispatchDueCohorts()).resolves.toBeUndefined();

    expect(orchestrator.triggerScoutRun).toHaveBeenCalledTimes(2);
    expect(prisma.scheduleConfig.update).toHaveBeenCalledTimes(1);
  });

  it("does not query for rows already dispatched today, per the findMany filter", async () => {
    prisma.scheduleConfig.findMany.mockResolvedValue([]);

    await scheduler.dispatchDueCohorts();

    expect(prisma.scheduleConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ lastDispatchedDate: null }]),
        }),
      }),
    );
  });
});
