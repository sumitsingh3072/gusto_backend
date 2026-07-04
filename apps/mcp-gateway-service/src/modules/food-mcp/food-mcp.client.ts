import { Injectable } from "@nestjs/common";
import { TokenProviderService } from "../token-provider/token-provider.service";

/**
 * Speaks Swiggy's streamable-HTTP MCP protocol to the Food MCP server. This
 * is the ONLY class in the entire backend that is allowed to hold/attach a
 * Swiggy OAuth token and call mcp.swiggy.com. Retries transient failures and
 * respects Swiggy's published rate limits (see rate-limiter module).
 */
@Injectable()
export class FoodMcpClient {
  constructor(private readonly tokenProvider: TokenProviderService) {}

  async callTool(tool: string, input: Record<string, unknown>) {
    throw new Error("not implemented in scaffold");
  }
}
