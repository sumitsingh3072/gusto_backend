import { Injectable } from "@nestjs/common";
import { AiAgentClient } from "../../clients/ai-agent.client";
import { CouponOptimizationClient } from "../../clients/coupon-optimization.client";
import { OrderExecutionClient } from "../../clients/order-execution.client";
import { NotificationClient } from "../../clients/notification.client";
import { EscrowClient } from "../../clients/escrow.client";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { WorkflowStateMachine } from "./workflow.state-machine";

/**
 * Coordinates the daily meal lifecycle. Owns workflow_state. Is the ONLY
 * service in the whole system permitted to call AiAgentClient -- it never
 * calls Swiggy directly (that goes through McpGatewayClient), never computes
 * coupon math itself (delegates to CouponOptimizationClient), and never
 * touches payment or the balance directly (delegates to EscrowClient /
 * OrderExecutionClient).
 */
@Injectable()
export class WorkflowService {
  constructor(
    private readonly aiAgent: AiAgentClient,
    private readonly couponOptimization: CouponOptimizationClient,
    private readonly orderExecution: OrderExecutionClient,
    private readonly notification: NotificationClient,
    private readonly escrow: EscrowClient,
    private readonly mcpGateway: McpGatewayClient,
    private readonly stateMachine: WorkflowStateMachine,
  ) {}

  async runScoutPhase() {
    throw new Error("not implemented in scaffold");
  }

  async handleUserDecision(decision: "APPROVE" | "SWAP" | "SKIP") {
    throw new Error("not implemented in scaffold");
  }
}
