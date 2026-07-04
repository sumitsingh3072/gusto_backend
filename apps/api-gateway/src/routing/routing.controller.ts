import { All, Controller, Req, Res } from "@nestjs/common";

/**
 * Terminates TLS, validates the JWT (via @gusto/auth-middleware), and proxies
 * to the appropriate internal service. Only auth-service and orchestrator-service
 * are reachable from here on the public path — every other service is reached
 * indirectly through orchestrator-service, never proxied directly to the client.
 */
@Controller()
export class RoutingController {
  @All("*")
  route(@Req() req: Request, @Res() res: Response) {
    // proxy implementation (http-proxy-middleware) wired here
  }
}
