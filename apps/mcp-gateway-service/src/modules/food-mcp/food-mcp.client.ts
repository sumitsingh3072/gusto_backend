import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import axios, { isAxiosError } from "axios";
import { createHash } from "node:crypto";
import { TokenProviderService } from "../token-provider/token-provider.service";
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
    // Cache-through for read-only Discover tools and get_food_cart. The key
    // is always scoped by userId -- harmless for the Discover tools (menus/
    // search results aren't user-specific, so this just means one cache
    // entry per user instead of a shared one) but mandatory for
    // get_food_cart, whose response IS user-specific: without userId in the
    // key, two different users calling get_food_cart with identical
    // arguments (e.g. the same addressId) would read each other's cart.
    const isCacheableTool = ["search_restaurants", "search_menu", "get_restaurant_menu", "get_food_cart"].includes(tool);
    let cacheKey: string | null = null;
    if (isCacheableTool) {
      cacheKey = this.buildCacheKey(tool, userId, args);
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
    const maxAttempts = NON_IDEMPOTENT_TOOLS.has(tool) ? 1 : 5;

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

        if (isCacheableTool && cacheKey && result && result.success) {
          // low-churn data cache for 5 mins
          await this.cache.set(cacheKey, result, 300);
        }

        if (result && result.success && (tool === "update_food_cart" || tool === "flush_food_cart")) {
          await this.invalidateCartCache(tool, userId, args);
        }

        return result;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
           this.handleFinalError(error);
        }
        
        if (!this.isRetryable(error, attempt)) {
           this.handleFinalError(error);
        }

        const baseMs = 500 * (2 ** (attempt - 1));
        const jitterMs = Math.random() * baseMs * 0.3;
        await new Promise((r) => setTimeout(r, baseMs + jitterMs));
      }
    }
  }

  private buildCacheKey(tool: string, userId: string, args: Record<string, unknown>): string {
    const argsHash = createHash("sha256").update(JSON.stringify(args || {})).digest("hex");
    return `mcp:food:${tool}:${userId}:${argsHash}`;
  }

  // Bust the cached get_food_cart response after a successful cart
  // mutation, so callers never read a stale cart for up to the cache's 5
  // minute TTL (KNOWN_ISSUES.md item 14).
  private async invalidateCartCache(tool: string, userId: string, args: Record<string, unknown>): Promise<void> {
    if (tool === "update_food_cart" && typeof args.addressId === "string") {
      // get_food_cart is called with {addressId} (restaurantName is an
      // optional display hint per its own docs) -- compute the exact key
      // for that shape and delete just it. Best-effort: if a caller passed
      // restaurantName to get_food_cart, that variant's cache entry (a
      // different hash) won't be targeted here and will simply expire on
      // its own TTL.
      const cartKey = this.buildCacheKey("get_food_cart", userId, { addressId: args.addressId });
      await this.cache.del(cartKey);
      return;
    }
    // flush_food_cart carries no arguments at all, so there's no addressId
    // to target a single entry -- fall back to clearing every cached
    // get_food_cart response for this user.
    await this.cache.delByPrefix(`mcp:food:get_food_cart:${userId}:`);
  }

  private isRetryable(error: any, attempt: number): boolean {
    const status = error?.response?.status;
    const message = error?.response?.data?.error?.message || "";

    if (status === 401 || error?.response?.data?.error?.code === -32001) return false;
    if (status === 400 || message.startsWith("Invalid ") || message.startsWith("Missing ")) return false;
    
    if (status === 504 || message.includes("timeout")) return true;
    if (status === 502 || status === 503) return true;
    
    if (status === 200 && error?.response?.data?.success === false) return false;
    
    if (status === 500 || error?.response?.data?.error?.code === -32603) {
      return attempt === 1; // Retry ONCE
    }

    return false;
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
