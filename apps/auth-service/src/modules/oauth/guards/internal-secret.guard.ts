import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { env } from "../../../config/configuration";

/**
 * Guards auth-service's internal-only endpoints (/auth/internal/*) with a
 * shared secret header, since these expose a decrypted Swiggy access token
 * / a user's preference profile to any caller that can reach this port.
 * Not mTLS -- a static shared secret is the minimum viable fix for
 * KNOWN_ISSUES.md item 4's "any service able to reach auth-service can
 * retrieve any user's decrypted token with just a userId" gap.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers["x-internal-secret"];
    if (!provided || provided !== env.INTERNAL_SHARED_SECRET) {
      throw new UnauthorizedException("Missing or invalid X-Internal-Secret header");
    }
    return true;
  }
}
