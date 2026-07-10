import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { FoodMcpModule } from "./modules/food-mcp/food-mcp.module";
import { InstamartMcpModule } from "./modules/instamart-mcp/instamart-mcp.module";
import { DineoutMcpModule } from "./modules/dineout-mcp/dineout-mcp.module";
import { RateLimiterModule } from "./modules/rate-limiter/rate-limiter.module";
import { RateLimiterMiddleware } from "./modules/rate-limiter/rate-limiter.middleware";
import { RedisModule } from "./modules/redis/redis.module";
import { CacheModule } from "./modules/cache/cache.module";

@Module({
  imports: [
    RedisModule,
    CacheModule,
    FoodMcpModule, 
    InstamartMcpModule, 
    DineoutMcpModule, 
    RateLimiterModule
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimiterMiddleware).forRoutes("mcp/food");
  }
}

