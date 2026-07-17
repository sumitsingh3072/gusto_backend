import jwt from "jsonwebtoken";

/**
 * The one typed shape for a Gusto session JWT payload. Previously
 * duplicated ad hoc in auth-service's JwtIssuerService and re-narrowed
 * manually in api-gateway's JwtAuthGuard -- this is now the single source
 * of truth (KNOWN_ISSUES.md item 6).
 */
export interface GustoJwtPayload {
  sub: string; // Gusto userId
  jti: string; // unique per issued token, used for logout/revocation
}

/**
 * Verifies the JWT issued by auth-service and returns its typed, validated
 * payload. Used by api-gateway on every inbound request, and optionally by
 * internal services that accept service-to-service calls carrying a
 * forwarded user context.
 *
 * Throws (jsonwebtoken's own errors for a bad signature/expiry, or a plain
 * Error for a payload that doesn't match GustoJwtPayload's shape) rather
 * than returning an unchecked value -- callers map the throw to their own
 * 401, they never need to re-implement the narrowing themselves.
 */
export function verifyJwt(token: string, secret: string): GustoJwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || typeof decoded.sub !== "string" || typeof decoded.jti !== "string") {
    throw new Error("Malformed token payload");
  }
  return { sub: decoded.sub, jti: decoded.jti };
}

/**
 * Minimal structural interface for what TokenBlocklistService needs --
 * satisfied by ioredis's Redis client without this package taking a hard
 * dependency on ioredis itself. Each consuming service wires its own Redis
 * connection (see mcp-gateway-service's RedisModule for the pattern) and
 * passes it in here.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
}

const BLOCKLIST_KEY_PREFIX = "jwt:blocklist:";

/**
 * Logout/revocation for Gusto session JWTs (KNOWN_ISSUES.md item 10).
 * Gusto JWTs are otherwise stateless -- verifyJwt() alone can't tell a
 * revoked token from a valid one, since a signature check can't know about
 * a logout that happened after issuance. This adds the one piece of state
 * needed: a blocklist entry per revoked token's `jti`, self-expiring at the
 * TTL the caller supplies (pass the token's own remaining time-to-expiry,
 * so the blocklist never needs separate cleanup -- an entry is only ever
 * needed until the token would have expired anyway).
 */
export class TokenBlocklistService {
  constructor(private readonly redis: RedisLike) {}

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.setex(`${BLOCKLIST_KEY_PREFIX}${jti}`, ttlSeconds, "1");
  }

  async isRevoked(jti: string): Promise<boolean> {
    const value = await this.redis.get(`${BLOCKLIST_KEY_PREFIX}${jti}`);
    return value !== null;
  }
}
