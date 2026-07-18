import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { Redis } from "ioredis";
import axios from "axios";
import { env } from "../../config/configuration";
import { REDIS_CLIENT } from "../redis/redis.module";

const CACHE_TTL_SECONDS = 30;

@Injectable()
export class TokenProviderService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getToken(userId: string): Promise<string> {
    const cacheKey = `mcp:token:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.post<{ token: string }>(
        `${env.AUTH_SERVICE_URL}/auth/internal/token`,
        { userId },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": env.INTERNAL_SHARED_SECRET,
          },
        }
      );

      const token = response.data.token;

      await this.redis.setex(cacheKey, CACHE_TTL_SECONDS, token);

      return token;
    } catch (error) {
      throw new InternalServerErrorException("Failed to retrieve MCP token from Auth Service");
    }
  }
}
