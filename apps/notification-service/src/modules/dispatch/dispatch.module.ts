import { Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";
import { SnsAdapter } from "./sns.adapter";
import { SesAdapter } from "./ses.adapter";
import { ContactPreferenceModule } from "../contact-preference/contact-preference.module";
import { NotificationSentPublisher } from "../../events/publishers/notification-sent.publisher";
import { env } from "../../config/configuration";

@Module({
  imports: [ContactPreferenceModule],
  controllers: [DispatchController],
  providers: [
    DispatchService,
    SnsAdapter,
    SesAdapter,
    { provide: EventPublisher, useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "notification-service") },
    {
      provide: NotificationSentPublisher,
      useFactory: (bus: EventPublisher) => new NotificationSentPublisher(bus),
      inject: [EventPublisher],
    },
  ],
  exports: [DispatchService],
})
export class DispatchModule {}
