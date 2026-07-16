import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { WorkflowService } from "../workflow/workflow.service";

const DecisionRequestSchema = z.object({
  userId: z.string().min(1),
  decision: z.enum(["APPROVE", "SWAP", "SKIP"]),
});

@Controller("workflow")
export class DecisionController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/decision -- user's Approve / Swap / Skip, forwarded via
  // notification-service's inbound webhook
  @Post("decision")
  decide(@Body() body: unknown) {
    const parsed = DecisionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.handleUserDecision(parsed.data.userId, parsed.data.decision);
  }
}
