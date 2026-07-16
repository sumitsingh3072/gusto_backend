import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3002),
  ORCHESTRATOR_DATABASE_URL: z.string().min(1),
  AUTH_SERVICE_URL: z.string().url(),
  AI_AGENT_SERVICE_URL: z.string().url(),
  COUPON_OPTIMIZATION_SERVICE_URL: z.string().url(),
  ORDER_EXECUTION_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url(),
  ESCROW_SERVICE_URL: z.string().url(),
  MCP_GATEWAY_SERVICE_URL: z.string().url(),
  ORCHESTRATOR_USER_AUTHENTICATED_QUEUE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
