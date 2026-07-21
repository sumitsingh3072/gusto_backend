import { Controller, Param, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("MCP Gateway - Instamart")
@ApiBearerAuth()
@Controller("mcp/instamart")
export class InstamartMcpController {
  @Post(":tool")
  @ApiOperation({ summary: "Call Instamart MCP tool", description: "Proxies a call to a Swiggy Instamart MCP tool. Currently not implemented — reserved for future use." })
  @ApiParam({ name: "tool", description: "The Instamart MCP tool name" })
  @ApiResponse({ status: 200, description: "Tool executed successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 503, description: "Service unavailable" })
  call(@Param("tool") tool: string) {
    console.log(tool);
    throw new Error("Instamart MCP integration not yet implemented (reserved for future use)");
  }
}
