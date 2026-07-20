import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ScheduleConfigService } from "./schedule-config.service";

// Local, internal-only schema -- no consumer wires this endpoint yet (same
// "designed ahead of its caller" pattern as escrow-service's tick() route).
const ScheduleConfigRequestSchema = z.object({
  userId: z.string().min(1),
  scoutTime: z.coerce.date(),
  notifyTime: z.coerce.date(),
  executeTime: z.coerce.date(),
  timezone: z.string().min(1).default("Asia/Kolkata"),
});

@ApiTags("ScheduleConfig")
@ApiBearerAuth()
@Controller("schedule-config")
export class ScheduleConfigController {
  constructor(private readonly scheduleConfig: ScheduleConfigService) {}

  @Post()
  @ApiOperation({ summary: "Upsert schedule config", description: "Creates or updates the daily schedule configuration for a user (scout, notify, execute times and timezone)." })
  @ApiResponse({ status: 200, description: "Schedule config upserted successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  upsert(@Body() body: unknown) {
    const parsed = ScheduleConfigRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId, scoutTime, notifyTime, executeTime, timezone } = parsed.data;
    return this.scheduleConfig.upsert(userId, scoutTime, notifyTime, executeTime, timezone);
  }
}
