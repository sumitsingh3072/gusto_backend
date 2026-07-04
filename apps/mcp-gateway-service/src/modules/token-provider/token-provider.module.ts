import { Module } from "@nestjs/common";
import { TokenProviderService } from "./token-provider.service";

@Module({
  providers: [TokenProviderService],
  exports: [TokenProviderService],
})
export class TokenProviderModule {}
