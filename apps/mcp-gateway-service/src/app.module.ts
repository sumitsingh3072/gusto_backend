import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { FoodMcpModule } from "./modules/food-mcp/food-mcp.module";
import { InstamartMcpModule } from "./modules/instamart-mcp/instamart-mcp.module";
import { DineoutMcpModule } from "./modules/dineout-mcp/dineout-mcp.module";
import { RateLimiterModule } from "./modules/rate-limiter/rate-limiter.module";

@Module({
  imports: [FoodMcpModule, InstamartMcpModule, DineoutMcpModule, RateLimiterModule],
  controllers: [HealthController],
})
export class AppModule {}
