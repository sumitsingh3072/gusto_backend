import { Body, Controller, Post } from "@nestjs/common";
import { OAuthService } from "./oauth.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";

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

  // POST /auth/token/refresh
  @Post("token/refresh")
  refresh(@Body() body: { refreshToken: string }) {
    return this.oauthService.refresh(body.refreshToken);
  }
}
