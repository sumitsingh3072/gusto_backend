import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { z } from "zod";
import { WorkflowService } from "./workflow.service";

// Local, internal-only schema. Neither CartOptimizedEvent nor any shared
// contract carries addressId/restaurantId (see order-execution-service's own
// documented reasoning for the same gap), so the caller (scheduler-service)
// supplies them directly in this route's body.
const ScoutRunRequestSchema = z.object({
  userId: z.string().min(1),
  addressId: z.string().min(1),
  restaurantId: z.string().min(1),
});

const UserIdRequestSchema = z.object({
  userId: z.string().min(1),
});

@ApiTags("Workflow")
@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/scout/run -- invoked by scheduler-service at T-2h
  @Post("scout/run")
  @ApiOperation({ summary: "Run Scout phase", description: "Invoked by scheduler-service at T-2h to execute the Scout phase for a user." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Scout phase executed successfully." })
  @ApiResponse({ status: 400, description: "Invalid request body – missing required fields." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  runScoutPhase(@Body() body: unknown) {
    const parsed = ScoutRunRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.runScoutPhase(parsed.data.userId, parsed.data.addressId, parsed.data.restaurantId);
  }

  // POST /workflow/notify-reminder -- invoked by scheduler-service at T-1h
  @Post("notify-reminder")
  @ApiOperation({ summary: "Send reminder notification", description: "Invoked by scheduler-service at T-1h to send a reminder if the user has a pending order." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Reminder sent or skipped (no pending order)." })
  @ApiResponse({ status: 400, description: "Invalid request body – missing userId." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  sendReminder(@Body() body: unknown) {
    const parsed = UserIdRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.sendReminderIfPending(parsed.data.userId);
  }

  // POST /workflow/finalize -- invoked by scheduler-service at T-30m
  @Post("finalize")
  @ApiOperation({ summary: "Finalize order", description: "Invoked by scheduler-service at T-30m to finalize a pending order." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Order finalized or skipped (no pending order)." })
  @ApiResponse({ status: 400, description: "Invalid request body – missing userId." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  finalize(@Body() body: unknown) {
    const parsed = UserIdRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.finalizeIfPending(parsed.data.userId);
  }
}
