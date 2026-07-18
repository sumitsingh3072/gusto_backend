import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
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

@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/scout/run -- invoked by scheduler-service at T-2h
  @Post("scout/run")
  runScoutPhase(@Body() body: unknown) {
    const parsed = ScoutRunRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.runScoutPhase(parsed.data.userId, parsed.data.addressId, parsed.data.restaurantId);
  }

  // POST /workflow/notify-reminder -- invoked by scheduler-service at T-1h
  @Post("notify-reminder")
  sendReminder(@Body() body: unknown) {
    const parsed = UserIdRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.sendReminderIfPending(parsed.data.userId);
  }

  // POST /workflow/finalize -- invoked by scheduler-service at T-30m
  @Post("finalize")
  finalize(@Body() body: unknown) {
    const parsed = UserIdRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.finalizeIfPending(parsed.data.userId);
  }
}
