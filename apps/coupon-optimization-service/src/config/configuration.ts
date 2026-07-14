import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3003),
  MCP_GATEWAY_URL: z.string().url(),
  EVENT_QUEUE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
