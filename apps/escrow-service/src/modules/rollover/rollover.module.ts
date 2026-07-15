import { Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { RolloverService } from "./rollover.service";
import { RolloverAppliedPublisher } from "../../events/publishers/rollover-applied.publisher";
import { env } from "../../config/configuration";

@Module({
  providers: [
    RolloverService,
    { provide: EventPublisher, useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "escrow-service") },
    {
      provide: RolloverAppliedPublisher,
      useFactory: (bus: EventPublisher) => new RolloverAppliedPublisher(bus),
      inject: [EventPublisher],
    },
  ],
  exports: [RolloverService],
})
export class RolloverModule {}
