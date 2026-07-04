import { Module } from "@nestjs/common";
import { DineoutMcpController } from "./dineout-mcp.controller";

/**
 * Reserved for future use: Dineout MCP (8 tools) would let the "Premium
 * Friday" rollover book an actual table instead of just a bigger delivery
 * order.
 */
@Module({
  controllers: [DineoutMcpController],
})
export class DineoutMcpModule {}
