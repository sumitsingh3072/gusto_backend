import jwt from "jsonwebtoken";

/**
 * Verifies the JWT issued by auth-service. Used by api-gateway on every
 * inbound request, and optionally by internal services that accept
 * service-to-service calls carrying a forwarded user context.
 */
export function verifyJwt(token: string, secret: string) {
  return jwt.verify(token, secret);
}
