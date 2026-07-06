import { Global, Module } from "@nestjs/common";
import { EventPublisher } from "@gusto/event-bus";
import { env } from "../config/configuration";

/**
 * Wires a single EventPublisher instance into Nest's DI container so
 * services can inject it directly instead of constructing their own.
 */
@Global()
@Module({
  providers: [
    {
      provide: EventPublisher,
      useFactory: () => new EventPublisher(env.EVENT_BUS_ENDPOINT, "auth-service"),
    },
  ],
  exports: [EventPublisher],
})
export class EventBusModule {}
