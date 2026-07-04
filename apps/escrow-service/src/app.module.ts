import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { WalletModule } from "./modules/wallet/wallet.module";
import { RolloverModule } from "./modules/rollover/rollover.module";

@Module({
  imports: [WalletModule, RolloverModule],
  controllers: [HealthController],
})
export class AppModule {}
