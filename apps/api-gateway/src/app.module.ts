import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { AuthProxyModule } from "./routing/auth-proxy.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RedisModule } from "./modules/redis/redis.module";
import { TokenBlocklistModule } from "./modules/token-blocklist/token-blocklist.module";

@Module({
  imports: [RedisModule, TokenBlocklistModule, AuthProxyModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
