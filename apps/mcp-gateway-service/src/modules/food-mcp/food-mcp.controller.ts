import { Body, Controller, Param, Post, Headers, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { FoodMcpClient } from "./food-mcp.client";

/**
 * Internal-only surface: POST /mcp/food/:tool. `tool` maps 1:1 onto one of
 * the 14 tools on Swiggy's Food MCP server (search_restaurants, search_menu,
 * get_restaurant_menu, update_food_cart, apply_food_coupon, fetch_food_coupons,
 * place_food_order, track_food_order, get_food_order_details, get_food_orders,
 * get_addresses, flush_food_cart, get_food_cart, report_error).
 */
@ApiTags("MCP Gateway - Food")
@ApiBearerAuth()
@Controller("mcp/food")
export class FoodMcpController {
  constructor(private readonly client: FoodMcpClient) {}

  @Post(":tool")
  @ApiOperation({ summary: "Call Food MCP tool", description: "Proxies a call to one of the 14 Swiggy Food MCP tools. The tool name is specified in the URL path." })
  @ApiParam({ name: "tool", description: "The Food MCP tool name (e.g. search_restaurants, place_food_order, track_food_order)" })
  @ApiResponse({ status: 200, description: "Tool executed successfully" })
  @ApiResponse({ status: 400, description: "Bad request — missing x-user-id header or invalid input" })
  @ApiResponse({ status: 503, description: "Service unavailable" })
  call(
    @Param("tool") tool: string, 
    @Body() input: Record<string, unknown>,
    @Headers("x-user-id") userId: string
  ) {
    if (!userId) {
      throw new HttpException("x-user-id header is required", HttpStatus.BAD_REQUEST);
    }
    return this.client.callTool(tool, input, userId);
  }
}
