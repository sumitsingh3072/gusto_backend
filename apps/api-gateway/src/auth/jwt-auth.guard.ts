import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { verifyJwt } from "@gusto/auth-middleware";
import { env } from "../config/configuration";
import jwt from "jsonwebtoken";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = verifyJwt(token, env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new UnauthorizedException("Malformed token payload");
    }

    request.user = { userId: decoded.sub };
    return true;
  }
}
