import { Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { verifyJwt, GustoJwtPayload } from "@gusto/auth-middleware";
import { env } from "../../config/configuration";

export interface VerifiedToken extends GustoJwtPayload {
  exp: number; // epoch seconds -- needed by logout to size the blocklist TTL
}

/**
 * Issues and validates Gusto's own session JWT -- separate from the Swiggy
 * access token, which is encrypted and never leaves this service. Even
 * though api-gateway is what checks this JWT on every inbound request,
 * auth-service is the source of truth for how it's validated: verify() here
 * delegates to the exact same @gusto/auth-middleware primitive api-gateway
 * uses, so there is one verification implementation, not two that could
 * drift apart.
 */
@Injectable()
export class JwtIssuerService {
  issue(userId: string): string {
    const payload: GustoJwtPayload = { sub: userId, jti: randomUUID() };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      algorithm: "HS256",
    });
  }

  verify(token: string): GustoJwtPayload {
    try {
      return verifyJwt(token, env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  // Used by POST /auth/logout -- needs `exp` too, to size the blocklist
  // entry's TTL to exactly the token's remaining lifetime.
  verifyWithExpiry(token: string): VerifiedToken {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    if (typeof decoded.sub !== "string" || typeof decoded.jti !== "string" || typeof decoded.exp !== "number") {
      throw new UnauthorizedException("Malformed token payload");
    }
    return { sub: decoded.sub, jti: decoded.jti, exp: decoded.exp };
  }
}
