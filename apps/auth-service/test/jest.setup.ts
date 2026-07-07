// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.AUTH_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=auth";
process.env.SWIGGY_OAUTH_BASE_URL = "https://mcp.swiggy.com";
process.env.SWIGGY_OAUTH_CLIENT_ID = "test-client-id";
process.env.SWIGGY_OAUTH_REDIRECT_URI = "https://gusto.example.com/auth/callback";
process.env.JWT_SECRET = "test-jwt-secret-at-least-16-chars";
process.env.JWT_EXPIRES_IN_SECONDS = "43200";
process.env.MCP_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
