import { Module } from "@nestjs/common";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { TokenVaultModule } from "../token-vault/token-vault.module";
import { JwtModule } from "../jwt/jwt.module";

@Module({
  imports: [TokenVaultModule, JwtModule],
  controllers: [OAuthController],
  providers: [OAuthService],
})
export class OAuthModule {}
