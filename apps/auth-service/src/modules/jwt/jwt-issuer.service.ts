import { Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { verifyJwt } from "@gusto/auth-middleware";
import { env } from "../../config/configuration";

export interface GustoJwtPayload {
  sub: string; // Gusto userId
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
    const payload: GustoJwtPayload = { sub: userId };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      algorithm: "HS256",
    });
  }

  verify(token: string): GustoJwtPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = verifyJwt(token, env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new UnauthorizedException("Malformed token payload");
    }

    return { sub: decoded.sub };
  }
}
