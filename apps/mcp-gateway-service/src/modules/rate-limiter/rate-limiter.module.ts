import { Module } from "@nestjs/common";
import { RateLimiterMiddleware } from "./rate-limiter.middleware";

@Module({
  providers: [RateLimiterMiddleware],
  exports: [RateLimiterMiddleware],
})
export class RateLimiterModule {}
