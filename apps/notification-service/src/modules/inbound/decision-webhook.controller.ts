import { Body, Controller, HttpException, Post, ServiceUnavailableException } from "@nestjs/common";
import axios from "axios";
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
  async forwardDecision(@Body() body: { userId: string; decision: "APPROVE" | "SWAP" | "SKIP" }) {
    try {
      return await this.orchestrator.submitDecision(body.userId, body.decision);
    } catch (err) {
      // Upstream error mapping per CLAUDE.md convention: upstream error
      // response -> rethrow with the same status; upstream unreachable ->
      // 503. Never leak raw axios errors/stack traces to a client.
      if (axios.isAxiosError(err)) {
        if (err.response) {
          const message = (err.response.data as { message?: string } | undefined)?.message ?? err.message;
          throw new HttpException(message, err.response.status);
        }
        throw new ServiceUnavailableException(`orchestrator-service unreachable: ${err.message}`);
      }
      throw err;
    }
  }
}
