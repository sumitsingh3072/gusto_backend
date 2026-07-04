import { Controller, Param, Post } from "@nestjs/common";

@Controller("mcp/instamart")
export class InstamartMcpController {
  @Post(":tool")
  call(@Param("tool") tool: string) {
    throw new Error("Instamart MCP integration not yet implemented (reserved for future use)");
  }
}
