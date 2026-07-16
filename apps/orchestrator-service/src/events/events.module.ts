import { Module, OnModuleInit } from "@nestjs/common";
import { EventSubscriber } from "@gusto/event-bus";
import { registerUserAuthenticatedConsumer } from "./consumers/user-authenticated.consumer";
import { env } from "../config/configuration";

@Module({})
export class EventsModule implements OnModuleInit {
  onModuleInit() {
    registerUserAuthenticatedConsumer(new EventSubscriber(env.ORCHESTRATOR_USER_AUTHENTICATED_QUEUE_URL));
  }
}
