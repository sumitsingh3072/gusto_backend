import { z } from "zod";

/**
 * Base env schema every service extends. Each service defines its own
 * schema (e.g. AuthServiceEnv) that .extend()s this with service-specific
 * vars (its own DATABASE_URL, etc.) and parses process.env at bootstrap so
 * missing config fails fast in CI, not in production.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]),
  LOG_LEVEL: z.string().default("info"),
  EVENT_BUS_ENDPOINT: z.string().url(),
  EVENT_BUS_REGION: z.string().default("ap-south-1"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
