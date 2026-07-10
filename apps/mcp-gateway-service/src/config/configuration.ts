import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3008),
  REDIS_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  SWIGGY_MCP_FOOD_URL: z.string().url().default("https://mcp.swiggy.com/food"),
  RATE_LIMIT_READ: z.coerce.number().default(120),
  RATE_LIMIT_WRITE: z.coerce.number().default(30),
});

export const env = envSchema.parse(process.env);
