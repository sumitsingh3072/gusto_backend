import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { verifyJwt, TokenBlocklistService } from "@gusto/auth-middleware";
import { env } from "../config/configuration";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenBlocklist: TokenBlocklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or malformed Authorization header");
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = verifyJwt(token, env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (await this.tokenBlocklist.isRevoked(payload.jti)) {
      throw new UnauthorizedException("Token has been revoked");
    }

    request.user = { userId: payload.sub };
    return true;
  }
}
