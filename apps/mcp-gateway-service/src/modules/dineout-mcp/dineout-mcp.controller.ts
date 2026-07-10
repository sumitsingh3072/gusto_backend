import { Controller, Param, Post } from "@nestjs/common";

@Controller("mcp/dineout")
export class DineoutMcpController {
  @Post(":tool")
  call(@Param("tool") tool: string) {
    console.log(tool);
    throw new Error("Dineout MCP integration not yet implemented (reserved for future use)");
  }
}
