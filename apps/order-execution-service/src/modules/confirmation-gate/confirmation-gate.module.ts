import { Module } from "@nestjs/common";
import { ConfirmationGateService } from "./confirmation-gate.service";
import { NotificationClient } from "../../clients/notification.client";
import { env } from "../../config/configuration";

@Module({
  providers: [
    ConfirmationGateService,
    {
      provide: NotificationClient,
      useFactory: () => new NotificationClient(env.NOTIFICATION_SERVICE_URL),
    },
  ],
  exports: [ConfirmationGateService],
})
export class ConfirmationGateModule {}
