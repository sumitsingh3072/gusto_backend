import { Inject, Injectable, NestMiddleware, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { REDIS_CLIENT } from "../redis/redis.module";
import { env } from "../../config/configuration";

const writeTools = new Set([
  "update_food_cart",
  "flush_food_cart",
  "apply_food_coupon",
  "place_food_order",
  "report_error"
]);

const WINDOW_SECONDS = 60;

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Sliding-window-log via a Redis sorted set, scored by request timestamp
  // (ms) -- enforces the limit over any trailing 60s span instead of
  // calendar-aligned windows, which is what let the previous fixed-window
  // (INCR+EXPIRE) implementation allow ~2x burst at a window boundary
  // (limit at the end of one window + limit at the start of the next,
  // back-to-back). See KNOWN_ISSUES.md item 12.
  //
  // NOTE: this middleware is the actual enforcement point wired into the
  // request pipeline (see rate-limiter.module.ts) -- a separate
  // RateLimiterService class existed with its own independent
  // implementation but was never provided/imported anywhere, same class of
  // bug as KNOWN_ISSUES.md item 26's duplicate TokenProviderService. That
  // dead file has been deleted; this is the only rate-limiter
  // implementation now.
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
    const key = `rate-limit:mcp:food:${isWriteTool ? "write" : "read"}:${userId}`;
    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}:${randomUUID()}`);
    pipeline.zcard(key);
    pipeline.expire(key, WINDOW_SECONDS);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > limit) {
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("Retry-After", WINDOW_SECONDS);
      throw new HttpException("Too Many Requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));

    next();
  }
}
