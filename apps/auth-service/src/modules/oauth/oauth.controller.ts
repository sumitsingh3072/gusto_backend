import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { OAuthService } from "./oauth.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { GetInternalTokenDto } from "./dto/get-internal-token.dto";
import { InternalSecretGuard } from "./guards/internal-secret.guard";

@Controller("auth")
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // POST /auth/login/start -- begin PKCE flow with Swiggy
  @Post("login/start")
  startLogin(@Body() dto: StartLoginDto) {
    return this.oauthService.startPkceFlow(dto);
  }

  // POST /auth/login/callback -- exchange authorization code for tokens
  @Post("login/callback")
  loginCallback(@Body() dto: LoginCallbackDto) {
    return this.oauthService.exchangeCodeForToken(dto);
  }

  // POST /auth/token/refresh -- check/renew the linked Swiggy session.
  // Swiggy does not issue refresh tokens (v1.0), so this may return a fresh
  // authorization URL instead of a token -- see OAuthService.refresh().
  @Post("token/refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.oauthService.refresh(dto);
  }

  // POST /auth/logout -- revoke the caller's own Gusto session JWT
  // (KNOWN_ISSUES.md item 10). Bearer-authenticated by the token itself,
  // no body needed.
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Headers("authorization") authHeader?: string) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or malformed Authorization header");
    }
    await this.oauthService.logout(authHeader.slice(7));
  }

  // POST /auth/internal/token -- get decrypted Swiggy token for internal use
  @UseGuards(InternalSecretGuard)
  @Post("internal/token")
  getInternalToken(@Body() dto: GetInternalTokenDto) {
    return this.oauthService.getDecryptedMcpToken(dto);
  }

  // GET /auth/internal/profile/:userId -- get a user's preference profile
  // for internal use (currently orchestrator-service's Scout phase)
  @UseGuards(InternalSecretGuard)
  @Get("internal/profile/:userId")
  getInternalProfile(@Param("userId") userId: string) {
    return this.oauthService.getPreferenceProfile(userId);
  }
}
