import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { InboundModule } from "./modules/inbound/inbound.module";
import { ContactPreferenceModule } from "./modules/contact-preference/contact-preference.module";
import { PrismaModule } from "./prisma/prisma.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [PrismaModule, DispatchModule, InboundModule, ContactPreferenceModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
