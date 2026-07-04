import { Injectable, NestMiddleware } from "@nestjs/common";

/**
 * Token-bucket rate limiter backed by Redis, enforcing Swiggy's published
 * MCP rate-limit guidelines across ALL callers (Scout, Hacker, Sentinel)
 * combined -- this is a shared budget, not per-service.
 */
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    throw new Error("not implemented in scaffold");
  }
}
