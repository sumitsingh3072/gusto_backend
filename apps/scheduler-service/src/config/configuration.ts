import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3006),
  SCHEDULER_DATABASE_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  ORCHESTRATOR_SERVICE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
