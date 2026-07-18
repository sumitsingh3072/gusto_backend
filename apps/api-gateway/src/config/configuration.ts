import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

/**
 * Extend the shared base schema with vars specific to ApiGateway.
 * Parsed once at bootstrap — an invalid/missing env var fails the
 * container's startup probe instead of failing silently at request time.
 */
export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  AUTH_SERVICE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  // Backs the logout/revocation blocklist check on every guarded request --
  // see KNOWN_ISSUES.md item 10.
  REDIS_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
