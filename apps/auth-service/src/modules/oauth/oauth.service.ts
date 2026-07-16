import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import axios, { isAxiosError } from "axios";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { TokenVaultService } from "../token-vault/token-vault.service";
import { JwtIssuerService } from "../jwt/jwt-issuer.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { GetInternalTokenDto } from "./dto/get-internal-token.dto";
import { UserAuthenticatedPublisher } from "../../events/publishers/user-authenticated.publisher";
import { EventPublisher } from "@gusto/event-bus";
import { env } from "../../config/configuration";

// Generous vs. Swiggy's 120s single-use authorization code lifetime -- this
// just needs to outlast the user completing phone+OTP in the browser.
// https://mcp.swiggy.com/builders/docs/start/authenticate/
const PENDING_SESSION_TTL_MS = 10 * 60 * 1000;

// Proactively treat the token as needing renewal shortly before it actually
// expires, so a request doesn't race the expiry boundary.
const REAUTH_THRESHOLD_MS = 60 * 1000;

export interface SwiggyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface AuthorizationChallenge {
  authorizationUrl: string;
  state: string;
}

interface SwiggyErrorBody {
  error?: string;
  error_description?: string;
}

/**
 * Owns the OAuth 2.1 + PKCE handshake with Swiggy. This is the one exception
 * to "only mcp-gateway-service calls Swiggy" -- this is identity/token
 * issuance, not an MCP tool call, so it talks to Swiggy's OAuth endpoint
 * directly and hands the resulting token to TokenVaultService for encrypted
 * storage.
 *
 * Gusto brokers Swiggy on behalf of many end users, so this follows Swiggy's
 * *delegated auth* flow (a pre-registered, allowlisted client_id issued at
 * onboarding) rather than the individual-developer Dynamic Client
 * Registration flow:
 * https://mcp.swiggy.com/builders/docs/start/enterprise/delegated-auth/
 */
@Injectable()
export class OAuthService {
  constructor(
    private readonly tokenVault: TokenVaultService,
    private readonly jwtIssuer: JwtIssuerService,
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async startPkceFlow(dto: StartLoginDto): Promise<AuthorizationChallenge> {
    await this.sweepExpiredSessions();

    // code_verifier / code_challenge generation exactly as specified by
    // Swiggy's docs: a random verifier, S256-hashed into the challenge.
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const state = randomBytes(16).toString("base64url");

    await this.prisma.pendingAuthSession.create({
      data: {
        state,
        userId: dto.userId,
        codeVerifier,
        redirectUri: env.SWIGGY_OAUTH_REDIRECT_URI,
        expiresAt: new Date(Date.now() + PENDING_SESSION_TTL_MS),
      },
    });

    return { authorizationUrl: this.buildAuthorizationUrl(codeChallenge, state), state };
  }

  async exchangeCodeForToken(dto: LoginCallbackDto): Promise<{ token: string; userId: string }> {
    const session = await this.prisma.pendingAuthSession.findUnique({ where: { state: dto.state } });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.deleteSession(session.state);
      }
      throw new UnauthorizedException("Authorization session is invalid or has expired -- restart login");
    }

    const swiggyToken = await this.requestToken({
      grant_type: "authorization_code",
      code: dto.code,
      code_verifier: session.codeVerifier,
      redirect_uri: session.redirectUri,
      client_id: env.SWIGGY_OAUTH_CLIENT_ID,
    });

    const encryptedMcpToken = this.tokenVault.encrypt(swiggyToken.access_token);
    const mcpTokenExpiresAt = new Date(Date.now() + swiggyToken.expires_in * 1000);

    await this.prisma.user.upsert({
      where: { id: session.userId },
      create: {
        id: session.userId,
        prefProfile: {},
        encryptedMcpToken,
        mcpTokenExpiresAt,
        mcpTokenScope: swiggyToken.scope,
      },
      update: {
        encryptedMcpToken,
        mcpTokenExpiresAt,
        mcpTokenScope: swiggyToken.scope,
      },
    });

    await this.deleteSession(session.state);

    const token = this.jwtIssuer.issue(session.userId);

    await new UserAuthenticatedPublisher(this.eventPublisher).publish({
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: session.userId,
    });

    return { token, userId: session.userId };
  }

  async refresh(
    dto: RefreshDto,
  ): Promise<{ status: "valid"; expiresAt: string } | (AuthorizationChallenge & { status: "reauthentication_required" })> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });

    const stillValid =
      user?.encryptedMcpToken && user.mcpTokenExpiresAt && user.mcpTokenExpiresAt.getTime() - Date.now() > REAUTH_THRESHOLD_MS;

    if (stillValid && user?.mcpTokenExpiresAt) {
      return { status: "valid", expiresAt: user.mcpTokenExpiresAt.toISOString() };
    }

    // Swiggy does not issue refresh tokens in v1.0 -- POST /auth/token only
    // accepts grant_type=authorization_code, so there is no backend-only way
    // to renew an access token. The only option is to re-run the redirect
    // flow; this is usually silent (no phone+OTP prompt) as long as the
    // user's underlying 30-day Swiggy session is still alive.
    // https://mcp.swiggy.com/builders/docs/start/enterprise/delegated-auth/
    const challenge = await this.startPkceFlow({ userId: dto.userId });
    return { ...challenge, status: "reauthentication_required" };
  }

  async getDecryptedMcpToken(dto: GetInternalTokenDto): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });

    if (!user || !user.encryptedMcpToken || !user.mcpTokenExpiresAt) {
      throw new UnauthorizedException("User does not have an active Swiggy MCP token");
    }

    if (user.mcpTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Swiggy MCP token has expired");
    }

    const decryptedToken = this.tokenVault.decrypt(user.encryptedMcpToken);
    return { token: decryptedToken };
  }

  // GET /auth/internal/profile/:userId -- read-only, internal-network-only
  // access to a user's preference profile. Same accepted-risk posture as
  // getDecryptedMcpToken (no credential, relies on network isolation --
  // see KNOWN_ISSUES.md item 4).
  async getPreferenceProfile(userId: string): Promise<{ userId: string; prefProfile: unknown }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`no user found for userId ${userId}`);
    }

    return { userId, prefProfile: user.prefProfile };
  }

  private buildAuthorizationUrl(codeChallenge: string, state: string): string {
    const url = new URL("/auth/authorize", env.SWIGGY_OAUTH_BASE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.SWIGGY_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.SWIGGY_OAUTH_REDIRECT_URI);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", env.SWIGGY_OAUTH_SCOPE);
    return url.toString();
  }

  private async requestToken(body: Record<string, string>): Promise<SwiggyTokenResponse> {
    try {
      const response = await axios.post<SwiggyTokenResponse>(
        new URL("/auth/token", env.SWIGGY_OAUTH_BASE_URL).toString(),
        body,
        { headers: { "Content-Type": "application/json" } },
      );
      return response.data;
    } catch (error) {
      if (isAxiosError<SwiggyErrorBody>(error)) {
        if (error.response) {
          const description =
            error.response.data?.error_description ?? error.response.data?.error ?? "Swiggy rejected the token exchange";
          throw new UnauthorizedException(description);
        }
        throw new ServiceUnavailableException("Could not reach Swiggy's OAuth server");
      }
      throw error;
    }
  }

  private async sweepExpiredSessions(): Promise<void> {
    await this.prisma.pendingAuthSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  private async deleteSession(state: string): Promise<void> {
    await this.prisma.pendingAuthSession.delete({ where: { state } }).catch(() => undefined);
  }
}
