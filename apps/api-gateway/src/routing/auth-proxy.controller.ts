import { Controller, Post, Body } from "@nestjs/common";
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
}
