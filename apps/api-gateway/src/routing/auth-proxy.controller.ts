import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthProxyService } from "./auth-proxy.service";
import { Public } from "../auth/public.decorator";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthProxyController {
  constructor(private readonly authProxy: AuthProxyService) {}

  @Public()
  @Post("login/start")
  @ApiOperation({ summary: "Start login (proxy)", description: "Proxies the login start request to auth-service." })
  @ApiResponse({ status: 200, description: "Login flow started." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  loginStart(@Body() body: unknown) {
    return this.authProxy.forward("POST", "/auth/login/start", body);
  }

  @Public()
  @Post("login/callback")
  @ApiOperation({ summary: "Login callback (proxy)", description: "Proxies the login callback request to auth-service." })
  @ApiResponse({ status: 200, description: "Login callback processed." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  loginCallback(@Body() body: unknown) {
    return this.authProxy.forward("POST", "/auth/login/callback", body);
  }

  @Post("token/refresh")
  @ApiOperation({ summary: "Refresh token (proxy)", description: "Proxies a token refresh request to auth-service using the caller's verified userId." })
  @ApiBearerAuth("bearer-auth")
  @ApiResponse({ status: 200, description: "Token refreshed or re-auth URL returned." })
  @ApiResponse({ status: 401, description: "Unauthorized – missing or invalid JWT." })
  refresh(@CurrentUser() user: { userId: string }) {
    // userId comes from the verified JWT, NEVER from the client body
    return this.authProxy.forward("POST", "/auth/token/refresh", { userId: user.userId });
  }

  // Forwards the caller's own Authorization header through to auth-service
  // -- logout revokes the ONE token being used, not every session the user
  // has, so auth-service needs the actual token's jti, not just a userId.
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Logout (proxy)", description: "Proxies the logout request to auth-service, forwarding the caller's Authorization header." })
  @ApiBearerAuth("bearer-auth")
  @ApiResponse({ status: 204, description: "Logout successful." })
  @ApiResponse({ status: 401, description: "Unauthorized – missing or invalid JWT." })
  logout(@Headers("authorization") authHeader: string) {
    return this.authProxy.forward("POST", "/auth/logout", undefined, authHeader);
  }
}
