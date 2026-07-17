import { JwtAuthGuard } from "./jwt-auth.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { TokenBlocklistService } from "@gusto/auth-middleware";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/configuration";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let tokenBlocklist: jest.Mocked<TokenBlocklistService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    tokenBlocklist = {
      isRevoked: jest.fn().mockResolvedValue(false),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<TokenBlocklistService>;

    guard = new JwtAuthGuard(reflector, tokenBlocklist);
  });

  function createMockContext(headers: Record<string, string>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  it("should return true if the handler is marked @Public()", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.anything());
  });

  it("should throw UnauthorizedException if Authorization header is missing", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException if token is signed with wrong secret", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const badToken = jwt.sign({ sub: "user-123", jti: randomUUID() }, "wrong-secret");
    const context = createMockContext({ authorization: `Bearer ${badToken}` });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException if the token has no jti (malformed payload)", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const noJtiToken = jwt.sign({ sub: "user-123" }, env.JWT_SECRET);
    const context = createMockContext({ authorization: `Bearer ${noJtiToken}` });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("should set request.user and return true for a valid, non-revoked token", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const validToken = jwt.sign({ sub: "user-123", jti: randomUUID() }, env.JWT_SECRET);

    const request = { headers: { authorization: `Bearer ${validToken}` } } as any;
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: "user-123" });
  });

  it("should throw UnauthorizedException for a valid but revoked token", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenBlocklist.isRevoked.mockResolvedValue(true);
    const revokedToken = jwt.sign({ sub: "user-123", jti: randomUUID() }, env.JWT_SECRET);
    const context = createMockContext({ authorization: `Bearer ${revokedToken}` });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
