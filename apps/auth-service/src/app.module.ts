import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { OAuthModule } from "./modules/oauth/oauth.module";
import { JwtModule } from "./modules/jwt/jwt.module";
import { TokenVaultModule } from "./modules/token-vault/token-vault.module";

@Module({
  imports: [OAuthModule, JwtModule, TokenVaultModule],
  controllers: [HealthController],
})
export class AppModule {}
