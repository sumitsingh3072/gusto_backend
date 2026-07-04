import { Module } from "@nestjs/common";
import { JwtIssuerService } from "./jwt-issuer.service";

@Module({
  providers: [JwtIssuerService],
  exports: [JwtIssuerService],
})
export class JwtModule {}
