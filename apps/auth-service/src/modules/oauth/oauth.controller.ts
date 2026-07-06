import { Body, Controller, Post } from "@nestjs/common";
import { OAuthService } from "./oauth.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";
import { RefreshDto } from "./dto/refresh.dto";

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
}
