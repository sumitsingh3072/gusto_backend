import { BadRequestException } from "@nestjs/common";
import { ScheduleConfigController } from "./schedule-config.controller";
import { ScheduleConfigService } from "./schedule-config.service";

describe("ScheduleConfigController", () => {
  let service: jest.Mocked<Pick<ScheduleConfigService, "upsert">>;
  let controller: ScheduleConfigController;

  beforeEach(() => {
    service = { upsert: jest.fn().mockResolvedValue({ id: "row-1" }) };
    controller = new ScheduleConfigController(service as unknown as ScheduleConfigService);
  });

  it("upserts a valid schedule config", async () => {
    const body = {
      userId: "user-1",
      scoutTime: "2026-07-16T10:00:00.000Z",
      notifyTime: "2026-07-16T11:00:00.000Z",
      executeTime: "2026-07-16T11:30:00.000Z",
    };

    await controller.upsert(body);

    expect(service.upsert).toHaveBeenCalledWith(
      "user-1",
      new Date(body.scoutTime),
      new Date(body.notifyTime),
      new Date(body.executeTime),
      "Asia/Kolkata",
    );
  });

  it("rejects a body missing required fields", () => {
    expect(() => controller.upsert({ userId: "user-1" })).toThrow(BadRequestException);
  });
});
