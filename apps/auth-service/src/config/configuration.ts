import { z } from "zod";
import { baseEnvSchema } from "@gusto/config";

/**
 * Extend the shared base schema with vars specific to AuthService.
 * Parsed once at bootstrap — an invalid/missing env var fails the
 * container's startup probe instead of failing silently at request time.
 */
export const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3001),

  // Prisma reads this directly via env() in schema.prisma too; re-validating
  // it here means a missing value fails fast at boot instead of surfacing as
  // an obscure error on the first query.
  AUTH_DATABASE_URL: z.string().min(1, "AUTH_DATABASE_URL is required"),

  // Swiggy OAuth 2.1 + PKCE. Gusto brokers Swiggy on behalf of many end
  // users rather than acting as one developer's personal agent, so this
  // follows Swiggy's *delegated auth* flow: the client_id below is issued to
  // Gusto at onboarding (a pre-registered, allowlisted platform client), not
  // obtained via runtime Dynamic Client Registration.
  // https://mcp.swiggy.com/builders/docs/start/enterprise/delegated-auth/
  SWIGGY_OAUTH_BASE_URL: z.string().url().default("https://mcp.swiggy.com"),
  SWIGGY_OAUTH_CLIENT_ID: z.string().min(1, "SWIGGY_OAUTH_CLIENT_ID is required"),
  // Must exactly match one of the redirect_uris Swiggy allowlisted for this
  // client_id at onboarding -- Swiggy rejects inexact string matches.
  SWIGGY_OAUTH_REDIRECT_URI: z.string().url(),
  SWIGGY_OAUTH_SCOPE: z.string().default("mcp:tools mcp:resources mcp:prompts"),

  // Gusto's own session token (separate from the Swiggy access token, which
  // never leaves this service). Expressed in seconds (not a duration string
  // like "12h") so it satisfies jsonwebtoken's numeric SignOptions.expiresIn
  // overload directly, with no string-parsing ambiguity.
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(43_200), // 12h

  // AES-256-GCM key used to encrypt the Swiggy access token at rest, base64
  // encoded, e.g. generated via `openssl rand -base64 32`.
  MCP_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((value) => {
      try {
        return Buffer.from(value, "base64").length === 32;
      } catch {
        return false;
      }
    }, "MCP_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key (e.g. `openssl rand -base64 32`)"),

  // Shared secret internal-only callers (mcp-gateway-service,
  // orchestrator-service, scheduler-service) must send as
  // X-Internal-Secret on /auth/internal/* routes -- see KNOWN_ISSUES.md
  // item 4.
  INTERNAL_SHARED_SECRET: z.string().min(16, "INTERNAL_SHARED_SECRET must be at least 16 characters"),

  // Backs the logout/revocation blocklist -- see KNOWN_ISSUES.md item 10.
  REDIS_URL: z.string().url(),
});

export type AuthServiceEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
