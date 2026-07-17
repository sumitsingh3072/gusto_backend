import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { OAuthModule } from "./modules/oauth/oauth.module";
import { JwtModule } from "./modules/jwt/jwt.module";
import { TokenVaultModule } from "./modules/token-vault/token-vault.module";
import { PrismaModule } from "./prisma/prisma.module";
import { EventBusModule } from "./events/event-bus.module";
import { CronModule } from "./modules/cron/cron.module";
import { RedisModule } from "./modules/redis/redis.module";

@Module({
  imports: [PrismaModule, EventBusModule, RedisModule, OAuthModule, JwtModule, TokenVaultModule, CronModule],
  controllers: [HealthController],
})
export class AppModule {}
