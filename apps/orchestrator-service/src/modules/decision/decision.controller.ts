import { Body, Controller, Post } from "@nestjs/common";
import { WorkflowService } from "../workflow/workflow.service";

@Controller("workflow")
export class DecisionController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/decision -- user's Approve / Swap / Skip, forwarded via
  // notification-service's inbound webhook
  @Post("decision")
  decide(@Body() body: { decision: "APPROVE" | "SWAP" | "SKIP" }) {
    return this.workflow.handleUserDecision(body.decision);
  }
}
