// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.MCP_GATEWAY_SERVICE_URL = "http://localhost:3008";
process.env.EVENT_QUEUE_URL = "http://localhost:4566/000000000000/test-queue";
