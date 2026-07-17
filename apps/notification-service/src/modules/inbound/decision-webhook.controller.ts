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
          // orchestrator's zod BadRequestException body is {formErrors,
          // fieldErrors} -- no top-level `.message` field to reach for.
          // Forward the real body as-is so callers see the actual
          // validation detail instead of axios's generic
          // "Request failed with status code N".
          throw new HttpException(err.response.data ?? err.message, err.response.status);
        }
        throw new ServiceUnavailableException(`orchestrator-service unreachable: ${err.message}`);
      }
      throw err;
    }
  }
}
