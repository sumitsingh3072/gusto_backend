// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.ORCHESTRATOR_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=orchestrator";
process.env.AUTH_SERVICE_URL = "http://localhost:3009";
process.env.AI_AGENT_SERVICE_URL = "http://localhost:8001";
process.env.COUPON_OPTIMIZATION_SERVICE_URL = "http://localhost:3003";
process.env.ORDER_EXECUTION_SERVICE_URL = "http://localhost:3004";
process.env.NOTIFICATION_SERVICE_URL = "http://localhost:3007";
process.env.ESCROW_SERVICE_URL = "http://localhost:3005";
process.env.MCP_GATEWAY_SERVICE_URL = "http://localhost:3008";
process.env.ORCHESTRATOR_USER_AUTHENTICATED_QUEUE_URL =
  "http://localhost:4566/000000000000/test-user-authenticated";
