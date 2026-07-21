import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { z } from "zod";
import { WorkflowService } from "../workflow/workflow.service";

const DecisionRequestSchema = z.object({
  userId: z.string().min(1),
  decision: z.enum(["APPROVE", "SWAP", "SKIP"]),
});

@ApiTags("Decision")
@Controller("workflow")
export class DecisionController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/decision -- user's Approve / Swap / Skip, forwarded via
  // notification-service's inbound webhook
  @Post("decision")
  @ApiOperation({ summary: "Submit user decision", description: "Handles a user's Approve/Swap/Skip decision, forwarded via notification-service's inbound webhook." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Decision processed successfully." })
  @ApiResponse({ status: 400, description: "Invalid request body – userId or decision missing/invalid." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  decide(@Body() body: unknown) {
    const parsed = DecisionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.workflow.handleUserDecision(parsed.data.userId, parsed.data.decision);
  }
}
