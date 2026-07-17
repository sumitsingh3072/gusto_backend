import { Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowStateMachine } from "./workflow.state-machine";
import { AiAgentClient } from "../../clients/ai-agent.client";
import { CouponOptimizationClient } from "../../clients/coupon-optimization.client";
import { OrderExecutionClient } from "../../clients/order-execution.client";
import { NotificationClient } from "../../clients/notification.client";
import { EscrowClient } from "../../clients/escrow.client";
import { AuthClient } from "../../clients/auth.client";
import { ScoutCompletedPublisher } from "../../events/publishers/scout-completed.publisher";
import { MenuProposedPublisher } from "../../events/publishers/menu-proposed.publisher";
import { MealApprovedPublisher } from "../../events/publishers/meal-approved.publisher";
import { MealSkippedPublisher } from "../../events/publishers/meal-skipped.publisher";
import { env } from "../../config/configuration";

@Module({
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowStateMachine,
    { provide: AiAgentClient, useFactory: () => new AiAgentClient(env.AI_AGENT_SERVICE_URL) },
    { provide: CouponOptimizationClient, useFactory: () => new CouponOptimizationClient(env.COUPON_OPTIMIZATION_SERVICE_URL) },
    { provide: OrderExecutionClient, useFactory: () => new OrderExecutionClient(env.ORDER_EXECUTION_SERVICE_URL) },
    { provide: NotificationClient, useFactory: () => new NotificationClient(env.NOTIFICATION_SERVICE_URL) },
    { provide: EscrowClient, useFactory: () => new EscrowClient(env.ESCROW_SERVICE_URL) },
    { provide: AuthClient, useFactory: () => new AuthClient(env.AUTH_SERVICE_URL, env.INTERNAL_SHARED_SECRET) },
    { provide: McpGatewayClient, useFactory: () => new McpGatewayClient(env.MCP_GATEWAY_SERVICE_URL) },
    { provide: EventPublisher, useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "orchestrator-service") },
    {
      provide: ScoutCompletedPublisher,
      useFactory: (bus: EventPublisher) => new ScoutCompletedPublisher(bus),
      inject: [EventPublisher],
    },
    {
      provide: MenuProposedPublisher,
      useFactory: (bus: EventPublisher) => new MenuProposedPublisher(bus),
      inject: [EventPublisher],
    },
    {
      provide: MealApprovedPublisher,
      useFactory: (bus: EventPublisher) => new MealApprovedPublisher(bus),
      inject: [EventPublisher],
    },
    {
      provide: MealSkippedPublisher,
      useFactory: (bus: EventPublisher) => new MealSkippedPublisher(bus),
      inject: [EventPublisher],
    },
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
