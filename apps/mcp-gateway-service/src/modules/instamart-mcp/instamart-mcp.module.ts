import { Module } from "@nestjs/common";
import { InstamartMcpController } from "./instamart-mcp.controller";

/**
 * Reserved for future use: Instamart MCP (13 tools) would let Gusto
 * auto-restock pantry staples between meal cycles. Not wired into any
 * workflow yet -- present so the integration point exists without any
 * other service needing to change when it's built out.
 */
@Module({
  controllers: [InstamartMcpController],
})
export class InstamartMcpModule {}
