import { Injectable } from "@nestjs/common";
import { HackerAlgorithm } from "./hacker.algorithm";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { OptimizedCart } from "@gusto/contracts";

/**
 * Fully stateless -- no database of its own. Reads live coupon/menu data via
 * mcp-gateway-service on every call and hands the math to HackerAlgorithm.
 */
@Injectable()
export class HackerService {
  constructor(
    private readonly algorithm: HackerAlgorithm,
    private readonly mcpGateway: McpGatewayClient,
  ) {}

  async optimize(shortlist: unknown): Promise<OptimizedCart> {
    throw new Error("not implemented in scaffold");
  }
}
