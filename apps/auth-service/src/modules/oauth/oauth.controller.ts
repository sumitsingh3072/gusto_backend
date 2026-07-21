import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { OAuthService } from "./oauth.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { GetInternalTokenDto } from "./dto/get-internal-token.dto";
import { InternalSecretGuard } from "./guards/internal-secret.guard";

@ApiTags("Auth")
@Controller("auth")
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // POST /auth/login/start -- begin PKCE flow with Swiggy
  @Post("login/start")
  @ApiOperation({ summary: "Start PKCE login flow", description: "Begins the PKCE authorization flow with Swiggy, returning a Swiggy authorization URL." })
  @ApiResponse({ status: 200, description: "Authorization URL returned successfully." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  startLogin(@Body() dto: StartLoginDto) {
    return this.oauthService.startPkceFlow(dto);
  }

  // POST /auth/login/callback -- exchange authorization code for tokens
  @Post("login/callback")
  @ApiOperation({ summary: "Exchange authorization code for tokens", description: "Exchanges the Swiggy authorization code for a session token and persists it." })
  @ApiResponse({ status: 200, description: "Token exchange successful." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  loginCallback(@Body() dto: LoginCallbackDto) {
    return this.oauthService.exchangeCodeForToken(dto);
  }

  // POST /auth/token/refresh -- check/renew the linked Swiggy session.
  // Swiggy does not issue refresh tokens (v1.0), so this may return a fresh
  // authorization URL instead of a token -- see OAuthService.refresh().
  @Post("token/refresh")
  @ApiOperation({ summary: "Refresh or re-authenticate Swiggy session", description: "Checks and potentially renews the linked Swiggy session. May return a fresh authorization URL." })
  @ApiResponse({ status: 200, description: "Token refreshed or re-auth URL returned." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  refresh(@Body() dto: RefreshDto) {
    return this.oauthService.refresh(dto);
  }

  // POST /auth/logout -- revoke the caller's own Gusto session JWT
  // (KNOWN_ISSUES.md item 10). Bearer-authenticated by the token itself,
  // no body needed.
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke current Gusto session", description: "Revokes the caller's own Gusto session JWT." })
  @ApiBearerAuth("bearer-auth")
  @ApiResponse({ status: 204, description: "Logout successful." })
  @ApiResponse({ status: 401, description: "Missing or malformed Authorization header." })
  async logout(@Headers("authorization") authHeader?: string) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or malformed Authorization header");
    }
    await this.oauthService.logout(authHeader.slice(7));
  }

  // POST /auth/internal/token -- get decrypted Swiggy token for internal use
  @UseGuards(InternalSecretGuard)
  @Post("internal/token")
  @ApiOperation({ summary: "Get decrypted Swiggy token", description: "Returns the decrypted Swiggy MCP token for internal service use." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Decrypted token returned." })
  @ApiResponse({ status: 401, description: "Missing or invalid internal secret." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  getInternalToken(@Body() dto: GetInternalTokenDto) {
    return this.oauthService.getDecryptedMcpToken(dto);
  }

  // GET /auth/internal/profile/:userId -- get a user's preference profile
  // for internal use (currently orchestrator-service's Scout phase)
  @UseGuards(InternalSecretGuard)
  @Get("internal/profile/:userId")
  @ApiOperation({ summary: "Get user preference profile", description: "Returns a user's preference profile for internal use (e.g. orchestrator-service Scout phase)." })
  @ApiParam({ name: "userId", description: "The user's unique identifier" })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Preference profile returned." })
  @ApiResponse({ status: 401, description: "Missing or invalid internal secret." })
  @ApiResponse({ status: 404, description: "User not found." })
  getInternalProfile(@Param("userId") userId: string) {
    return this.oauthService.getPreferenceProfile(userId);
  }
}
