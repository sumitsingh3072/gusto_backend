import { Body, Controller, Post } from "@nestjs/common";
import { OrchestratorClient } from "../../clients/orchestrator.client";

/**
 * Inbound channel for the user's Approve/Swap/Skip and biometric
 * confirmation, forwarded to orchestrator-service (decisions) or
 * order-execution-service (confirmations) respectively.
 */
@Controller("notify")
export class DecisionWebhookController {
  constructor(private readonly orchestrator: OrchestratorClient) {}

  @Post("decision")
  forwardDecision(@Body() body: { decision: "APPROVE" | "SWAP" | "SKIP" }) {
    return this.orchestrator.submitDecision(body.decision);
  }
}
