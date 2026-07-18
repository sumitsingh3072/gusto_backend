import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { TokenBlocklistService } from "@gusto/auth-middleware";
import { REDIS_CLIENT } from "../redis/redis.module";

@Global()
@Module({
  providers: [
    {
      provide: TokenBlocklistService,
      useFactory: (redis: Redis) => new TokenBlocklistService(redis),
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [TokenBlocklistService],
})
export class TokenBlocklistModule {}
