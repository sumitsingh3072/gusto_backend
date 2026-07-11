import { JwtAuthGuard } from "./jwt-auth.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "./public.decorator";
import jwt from "jsonwebtoken";
import { env } from "../config/configuration";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(reflector);
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

  it("should return true if the handler is marked @Public()", () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({});
    
    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.anything());
  });

  it("should throw UnauthorizedException if Authorization header is missing", () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({});
    
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException if token is signed with wrong secret", () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const badToken = jwt.sign({ sub: "user-123" }, "wrong-secret");
    const context = createMockContext({ authorization: `Bearer ${badToken}` });
    
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("should set request.user and return true for a valid token", () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const validToken = jwt.sign({ sub: "user-123" }, env.JWT_SECRET);
    
    const request = { headers: { authorization: `Bearer ${validToken}` } } as any;
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ userId: "user-123" });
  });
});
