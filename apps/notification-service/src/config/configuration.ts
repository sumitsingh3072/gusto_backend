import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3007),
  NOTIFICATION_DATABASE_URL: z.string().min(1),
  ORCHESTRATOR_SERVICE_URL: z.string().url(),
  SES_FROM_EMAIL_ADDRESS: z.string().min(1),
  SNS_IOS_PLATFORM_APPLICATION_ARN: z.string().optional(),
  SNS_ANDROID_PLATFORM_APPLICATION_ARN: z.string().optional(),
  NOTIFICATION_MENU_PROPOSED_QUEUE_URL: z.string().url(),
  NOTIFICATION_ORDER_PLACED_QUEUE_URL: z.string().url(),
  NOTIFICATION_ORDER_DELIVERED_QUEUE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
