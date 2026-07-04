import axios from "axios";

/**
 * Typed internal client used by orchestrator-service, coupon-optimization-service,
 * and order-execution-service to reach mcp-gateway-service. This is NOT a client
 * for Swiggy's MCP servers directly — no service other than mcp-gateway-service
 * is allowed to hold a Swiggy credential or call mcp.swiggy.com. This SDK exists
 * so every caller talks to the Gateway through the same typed surface instead of
 * hand-rolling HTTP calls.
 */
export class McpGatewayClient {
  constructor(private readonly baseUrl: string) {}

  food(tool: string, input: Record<string, unknown>) {
    return axios.post(`${this.baseUrl}/mcp/food/${tool}`, input).then((r) => r.data);
  }

  instamart(tool: string, input: Record<string, unknown>) {
    return axios.post(`${this.baseUrl}/mcp/instamart/${tool}`, input).then((r) => r.data);
  }

  dineout(tool: string, input: Record<string, unknown>) {
    return axios.post(`${this.baseUrl}/mcp/dineout/${tool}`, input).then((r) => r.data);
  }
}
