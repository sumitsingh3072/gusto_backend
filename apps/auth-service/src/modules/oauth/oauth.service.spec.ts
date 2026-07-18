import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import axios from "axios";
import { OAuthService } from "./oauth.service";
import { TokenVaultService } from "../token-vault/token-vault.service";
import { JwtIssuerService } from "../jwt/jwt-issuer.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EventPublisher } from "@gusto/event-bus";
import { TokenBlocklistService } from "@gusto/auth-middleware";

jest.mock("axios");

type MockPrisma = {
  pendingAuthSession: {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  user: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
  };
};

function createMockPrisma(): MockPrisma {
  return {
    pendingAuthSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

describe("OAuthService", () => {
  let prisma: MockPrisma;
  let tokenVault: TokenVaultService;
  let jwtIssuer: JwtIssuerService;
  let eventPublisher: EventPublisher;
  let tokenBlocklist: jest.Mocked<TokenBlocklistService>;
  let service: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    tokenVault = new TokenVaultService();
    jwtIssuer = new JwtIssuerService();
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as EventPublisher;
    tokenBlocklist = { revoke: jest.fn().mockResolvedValue(undefined), isRevoked: jest.fn() } as unknown as jest.Mocked<TokenBlocklistService>;
    service = new OAuthService(tokenVault, jwtIssuer, prisma as unknown as PrismaService, eventPublisher, tokenBlocklist);
  });

  describe("startPkceFlow", () => {
    it("sweeps expired sessions, persists a new session, and returns a well-formed authorize URL", async () => {
      prisma.pendingAuthSession.deleteMany.mockResolvedValue({ count: 0 });
      prisma.pendingAuthSession.create.mockResolvedValue({});

      const result = await service.startPkceFlow({ userId: "user-1" });

      expect(prisma.pendingAuthSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
      expect(prisma.pendingAuthSession.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.pendingAuthSession.create.mock.calls[0][0];
      expect(createArgs.data.userId).toEqual("user-1");
      expect(createArgs.data.state).toEqual(result.state);
      expect(typeof createArgs.data.codeVerifier).toBe("string");

      const url = new URL(result.authorizationUrl);
      expect(url.origin + url.pathname).toEqual("https://mcp.swiggy.com/auth/authorize");
      expect(url.searchParams.get("response_type")).toEqual("code");
      expect(url.searchParams.get("code_challenge_method")).toEqual("S256");
      expect(url.searchParams.get("state")).toEqual(result.state);
      expect(url.searchParams.get("client_id")).toEqual("test-client-id");
    });
  });

  describe("exchangeCodeForToken", () => {
    const session = {
      state: "state-abc",
      userId: "user-1",
      codeVerifier: "verifier-xyz",
      redirectUri: "https://gusto.example.com/auth/callback",
      expiresAt: new Date(Date.now() + 60_000),
    };

    it("rejects an unknown or expired state without calling Swiggy", async () => {
      prisma.pendingAuthSession.findUnique.mockResolvedValue(null);

      await expect(service.exchangeCodeForToken({ code: "abc", state: "does-not-exist" })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("exchanges the code, stores an encrypted token, issues a Gusto JWT, and publishes UserAuthenticated", async () => {
      prisma.pendingAuthSession.findUnique.mockResolvedValue(session);
      prisma.pendingAuthSession.delete.mockResolvedValue(session);
      prisma.user.upsert.mockResolvedValue({});
      (axios.post as jest.Mock).mockResolvedValue({
        data: { access_token: "swiggy-token-abc", token_type: "Bearer", expires_in: 432_000, scope: "mcp:tools" },
      });

      const result = await service.exchangeCodeForToken({ code: "auth-code", state: "state-abc" });

      expect(axios.post).toHaveBeenCalledWith(
        "https://mcp.swiggy.com/auth/token",
        expect.objectContaining({
          grant_type: "authorization_code",
          code: "auth-code",
          code_verifier: "verifier-xyz",
          redirect_uri: session.redirectUri,
          client_id: "test-client-id",
        }),
        expect.anything(),
      );

      const upsertArgs = prisma.user.upsert.mock.calls[0][0];
      expect(upsertArgs.where).toEqual({ id: "user-1" });
      expect(upsertArgs.create.encryptedMcpToken).not.toEqual("swiggy-token-abc");
      expect(tokenVault.decrypt(upsertArgs.create.encryptedMcpToken)).toEqual("swiggy-token-abc");

      expect(prisma.pendingAuthSession.delete).toHaveBeenCalledWith({ where: { state: "state-abc" } });
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "UserAuthenticated",
        expect.objectContaining({ userId: "user-1" }),
      );

      expect(result.userId).toEqual("user-1");
      expect(jwtIssuer.verify(result.token).sub).toEqual("user-1");
    });
  });

  describe("refresh", () => {
    it("reports a still-valid token without starting a new PKCE flow", async () => {
      prisma.user.findUnique.mockResolvedValue({
        encryptedMcpToken: "irrelevant",
        mcpTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const result = await service.refresh({ userId: "user-1" });

      expect(result.status).toEqual("valid");
      expect(prisma.pendingAuthSession.create).not.toHaveBeenCalled();
    });

    it("starts a new PKCE flow when there is no linked Swiggy session at all", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.pendingAuthSession.deleteMany.mockResolvedValue({ count: 0 });
      prisma.pendingAuthSession.create.mockResolvedValue({});

      const result = await service.refresh({ userId: "user-1" });

      expect(result.status).toEqual("reauthentication_required");
      expect(prisma.pendingAuthSession.create).toHaveBeenCalledTimes(1);
    });

    it("starts a new PKCE flow when the token is expired -- Swiggy has no refresh grant in v1.0", async () => {
      prisma.user.findUnique.mockResolvedValue({
        encryptedMcpToken: "irrelevant",
        mcpTokenExpiresAt: new Date(Date.now() - 1000),
      });
      prisma.pendingAuthSession.deleteMany.mockResolvedValue({ count: 0 });
      prisma.pendingAuthSession.create.mockResolvedValue({});

      const result = await service.refresh({ userId: "user-1" });

      expect(result.status).toEqual("reauthentication_required");
    });
  });

  describe("logout", () => {
    it("revokes the token's jti with a TTL matching its remaining lifetime", async () => {
      const token = jwtIssuer.issue("user-1");

      await service.logout(token);

      expect(tokenBlocklist.revoke).toHaveBeenCalledTimes(1);
      const [jti, ttlSeconds] = tokenBlocklist.revoke.mock.calls[0];
      expect(typeof jti).toBe("string");
      expect(ttlSeconds).toBeGreaterThan(0);
      expect(ttlSeconds).toBeLessThanOrEqual(43_200);
    });

    it("rejects a garbage token without calling revoke", async () => {
      await expect(service.logout("not-a-real-jwt")).rejects.toThrow(UnauthorizedException);
      expect(tokenBlocklist.revoke).not.toHaveBeenCalled();
    });
  });

  describe("getPreferenceProfile", () => {
    it("returns the user's stored preference profile", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", prefProfile: { diet: "veg" } });

      const result = await service.getPreferenceProfile("user-1");

      expect(result).toEqual({ userId: "user-1", prefProfile: { diet: "veg" } });
    });

    it("throws NotFoundException when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPreferenceProfile("no-such-user")).rejects.toThrow(NotFoundException);
    });
  });
});
