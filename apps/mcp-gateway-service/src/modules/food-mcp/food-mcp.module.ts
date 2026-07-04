import { Module } from "@nestjs/common";
import { FoodMcpController } from "./food-mcp.controller";
import { FoodMcpClient } from "./food-mcp.client";
import { TokenProviderModule } from "../token-provider/token-provider.module";

@Module({
  imports: [TokenProviderModule],
  controllers: [FoodMcpController],
  providers: [FoodMcpClient],
})
export class FoodMcpModule {}
