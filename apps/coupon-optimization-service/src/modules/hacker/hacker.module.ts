import { Module } from "@nestjs/common";
import { HackerController } from "./hacker.controller";
import { HackerService } from "./hacker.service";
import { HackerAlgorithm } from "./hacker.algorithm";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { EventPublisher } from "@gusto/event-bus";
import { CartOptimizedPublisher } from "../../events/publishers/cart-optimized.publisher";
import { env } from "../../config/configuration";

@Module({
  controllers: [HackerController],
  providers: [
    HackerService,
    HackerAlgorithm,
    {
      provide: McpGatewayClient,
      useFactory: () => new McpGatewayClient(env.MCP_GATEWAY_SERVICE_URL),
    },
    {
      provide: EventPublisher,
      useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "coupon-optimization-service"),
    },
    {
      provide: CartOptimizedPublisher,
      useFactory: (bus: EventPublisher) => new CartOptimizedPublisher(bus),
      inject: [EventPublisher],
    },
  ],
})
export class HackerModule {}
