import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthProxyService } from "./auth-proxy.service";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("auth")
export class AuthProxyController {
  constructor(private readonly authProxy: AuthProxyService) {}

  @Public()
  @Post("login/start")
  loginStart(@Body() body: unknown) {
    return this.authProxy.forward("POST", "/auth/login/start", body);
  }

  @Public()
  @Post("login/callback")
  loginCallback(@Body() body: unknown) {
    return this.authProxy.forward("POST", "/auth/login/callback", body);
  }

  @Post("token/refresh")
  refresh(@CurrentUser() user: { userId: string }) {
    // userId comes from the verified JWT, NEVER from the client body
    return this.authProxy.forward("POST", "/auth/token/refresh", { userId: user.userId });
  }

  // Forwards the caller's own Authorization header through to auth-service
  // -- logout revokes the ONE token being used, not every session the user
  // has, so auth-service needs the actual token's jti, not just a userId.
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Headers("authorization") authHeader: string) {
    return this.authProxy.forward("POST", "/auth/logout", undefined, authHeader);
  }
}
