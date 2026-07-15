import { Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { ConfirmationGateModule } from "../confirmation-gate/confirmation-gate.module";
import { EscrowClient } from "../../clients/escrow.client";
import { OrderPlacedPublisher } from "../../events/publishers/order-placed.publisher";
import { OrderDeliveredPublisher } from "../../events/publishers/order-delivered.publisher";
import { OrderFailedPublisher } from "../../events/publishers/order-failed.publisher";
import { env } from "../../config/configuration";

@Module({
  imports: [ConfirmationGateModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    {
      provide: McpGatewayClient,
      useFactory: () => new McpGatewayClient(env.MCP_GATEWAY_SERVICE_URL),
    },
    {
      provide: EscrowClient,
      useFactory: () => new EscrowClient(env.ESCROW_SERVICE_URL),
    },
    { provide: EventPublisher, useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "order-execution-service") },
    {
      provide: OrderPlacedPublisher,
      useFactory: (bus: EventPublisher) => new OrderPlacedPublisher(bus),
      inject: [EventPublisher],
    },
    {
      provide: OrderDeliveredPublisher,
      useFactory: (bus: EventPublisher) => new OrderDeliveredPublisher(bus),
      inject: [EventPublisher],
    },
    {
      provide: OrderFailedPublisher,
      useFactory: (bus: EventPublisher) => new OrderFailedPublisher(bus),
      inject: [EventPublisher],
    },
  ],
})
export class OrderLifecycleModule {}
