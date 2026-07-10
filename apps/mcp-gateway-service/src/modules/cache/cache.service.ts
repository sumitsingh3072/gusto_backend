import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
}
