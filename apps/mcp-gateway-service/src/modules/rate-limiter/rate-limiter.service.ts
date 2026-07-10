import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";
import { env } from "../../config/configuration";

@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async checkLimit(userId: string, isWriteTool: boolean): Promise<boolean> {
    const limit = isWriteTool ? env.RATE_LIMIT_WRITE : env.RATE_LIMIT_READ;
    const windowSeconds = 60;
    
    // Simple fixed window limit (for simplicity as a starting point, INCR+EXPIRE)
    // For more accuracy, you could use a sliding window with ZSET or Redis limiters.
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / windowSeconds);
    
    const key = `rate-limit:mcp:food:${isWriteTool ? 'write' : 'read'}:${userId}:${window}`;
    
    // We could use a transaction here, but INCR and EXPIRE sequence is generally safe enough
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      // Set expiration to slightly more than the window
      await this.redis.expire(key, windowSeconds + 10);
    }
    
    return count <= limit;
  }
}
