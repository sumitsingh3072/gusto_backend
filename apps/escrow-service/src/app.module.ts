import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { WalletModule } from "./modules/wallet/wallet.module";
import { RolloverModule } from "./modules/rollover/rollover.module";
import { PrismaModule } from "./prisma/prisma.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [PrismaModule, WalletModule, RolloverModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
