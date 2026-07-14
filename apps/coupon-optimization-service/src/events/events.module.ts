import { Module, OnModuleInit } from "@nestjs/common";
import { EventSubscriber } from "@gusto/event-bus";
import { registerScoutCompletedConsumer } from "./consumers/scout-completed.consumer";
import { env } from "../config/configuration";

@Module({})
export class EventsModule implements OnModuleInit {
  onModuleInit() {
    const subscriber = new EventSubscriber(env.EVENT_QUEUE_URL);
    registerScoutCompletedConsumer(subscriber);
  }
}
