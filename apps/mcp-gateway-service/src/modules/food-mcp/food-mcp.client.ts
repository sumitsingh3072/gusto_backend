import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import axios, { isAxiosError } from "axios";
import { createHash } from "node:crypto";
import { TokenProviderService } from "./token-provider.service";
import { CacheService } from "../cache/cache.service";
import { env } from "../../config/configuration";
import { createLogger } from "@gusto/logger";

const logger = createLogger("FoodMcpClient");

const NON_IDEMPOTENT_TOOLS = new Set(["place_food_order"]);

/**
 * Speaks Swiggy's streamable-HTTP MCP protocol to the Food MCP server.
 */
@Injectable()
export class FoodMcpClient {
  constructor(
    private readonly tokenProvider: TokenProviderService,
    private readonly cache: CacheService,
  ) {}

  async callTool(tool: string, args: Record<string, unknown>, userId: string) {
    const isReadTool = !["update_food_cart", "flush_food_cart", "apply_food_coupon", "place_food_order", "report_error"].includes(tool);
    
    // Cache-through for read-only tools
    let cacheKey: string | null = null;
    if (isReadTool) {
      const argsHash = createHash("sha256").update(JSON.stringify(args || {})).digest("hex");
      cacheKey = `mcp:food:${tool}:${argsHash}`;
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const token = await this.tokenProvider.getToken(userId);

    const payload = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: tool,
        arguments: args,
      },
      id: Math.floor(Math.random() * 1000000),
    };

    let attempt = 0;
    const maxAttempts = NON_IDEMPOTENT_TOOLS.has(tool) ? 1 : 4;

    while (true) {
      try {
        const response = await axios.post(
          env.SWIGGY_MCP_FOOD_URL,
          payload,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 5000,
          }
        );

        // Swiggy docs: { success: true, data: {...} } or { success: false, error: {...} }
        // JSON-RPC level might also return error, but Swiggy MCP wraps it in result if success
        const result = response.data;
        
        if (isReadTool && cacheKey && result && result.success) {
          // low-churn data cache for 5 mins
          await this.cache.set(cacheKey, result, 300);
        }

        return result;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
           this.handleFinalError(error);
        }
        
        if (!this.isRetryable(error)) {
           this.handleFinalError(error);
        }

        const baseMs = 500 * (2 ** (attempt - 1));
        const jitterMs = Math.random() * baseMs * 0.3;
        await new Promise((r) => setTimeout(r, baseMs + jitterMs));
      }
    }
  }

  private isRetryable(error: any): boolean {
    const status = error?.response?.status;
    if (status && status >= 500 && status < 600) return true;
    const code = error?.response?.data?.error?.code;
    return ["UPSTREAM_TIMEOUT", "UPSTREAM_ERROR", "INTERNAL_ERROR"].includes(code);
  }

  private handleFinalError(error: any): never {
    if (isAxiosError(error) && error.response) {
      throw new HttpException(
        error.response.data || "Upstream MCP error",
        error.response.status
      );
    }
    logger.error("Food MCP network error", error);
    throw new HttpException("Service Unavailable", HttpStatus.SERVICE_UNAVAILABLE);
  }
}
