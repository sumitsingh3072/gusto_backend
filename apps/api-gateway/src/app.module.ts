import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { AuthProxyModule } from "./routing/auth-proxy.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

@Module({
  imports: [AuthProxyModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
