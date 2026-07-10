import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { env } from "../../config/configuration";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis(env.REDIS_URL);
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
