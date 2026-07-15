import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3005),
  ESCROW_DATABASE_URL: z.string().min(1),
  // Two separate queues -- EventSubscriber drives exactly one event type per
  // instance, so OrderPlaced and MealSkipped each need their own queue/consumer.
  ESCROW_ORDER_PLACED_QUEUE_URL: z.string().url(),
  ESCROW_MEAL_SKIPPED_QUEUE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
