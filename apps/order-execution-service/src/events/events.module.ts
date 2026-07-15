import { Module, OnModuleInit } from "@nestjs/common";
import { EventSubscriber } from "@gusto/event-bus";
import { registerCartOptimizedConsumer } from "./consumers/cart-optimized.consumer";
import { registerMealApprovedConsumer } from "./consumers/meal-approved.consumer";
import { env } from "../config/configuration";

// Two separate EventSubscriber instances, one per queue -- EventSubscriber
// only drives one event type per instance (subscriber.on() is a no-op on a
// second call), so CartOptimized and MealApproved each need their own queue.
@Module({})
export class EventsModule implements OnModuleInit {
  onModuleInit() {
    registerCartOptimizedConsumer(new EventSubscriber(env.ORDER_EXECUTION_CART_OPTIMIZED_QUEUE_URL));
    registerMealApprovedConsumer(new EventSubscriber(env.ORDER_EXECUTION_MEAL_APPROVED_QUEUE_URL));
  }
}
