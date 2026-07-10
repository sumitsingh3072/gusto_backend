import { Inject, Injectable, NestMiddleware, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";
import { env } from "../../config/configuration";

const writeTools = new Set([
  "update_food_cart",
  "flush_food_cart",
  "apply_food_coupon",
  "place_food_order",
  "report_error"
]);

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      throw new HttpException("x-user-id header is required", HttpStatus.BAD_REQUEST);
    }

    // Extract tool from path: /mcp/food/:tool
    const parts = req.path.split("/");
    const tool = parts[parts.length - 1];
    
    const isWriteTool = writeTools.has(tool);
    const limit = isWriteTool ? env.RATE_LIMIT_WRITE : env.RATE_LIMIT_READ;
    const windowSeconds = 60;
    
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / windowSeconds);
    const key = `rate-limit:mcp:food:${isWriteTool ? 'write' : 'read'}:${userId}:${window}`;
    
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds + 10);
    }

    if (count > limit) {
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("Retry-After", windowSeconds - (now % windowSeconds));
      throw new HttpException("Too Many Requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));
    
    next();
  }
}
