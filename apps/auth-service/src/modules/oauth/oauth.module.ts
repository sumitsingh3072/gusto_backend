import { Module } from "@nestjs/common";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { TokenVaultModule } from "../token-vault/token-vault.module";
import { JwtModule } from "../jwt/jwt.module";
import { TokenBlocklistModule } from "../token-blocklist/token-blocklist.module";

@Module({
  imports: [TokenVaultModule, JwtModule, TokenBlocklistModule],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
