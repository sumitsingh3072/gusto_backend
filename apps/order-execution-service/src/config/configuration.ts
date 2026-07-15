import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  ORDER_EXECUTION_DATABASE_URL: z.string().min(1),
  MCP_GATEWAY_SERVICE_URL: z.string().url(),
  ESCROW_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url(),
  ORDER_EXECUTION_CART_OPTIMIZED_QUEUE_URL: z.string().url(),
  ORDER_EXECUTION_MEAL_APPROVED_QUEUE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
