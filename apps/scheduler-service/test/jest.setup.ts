// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.SCHEDULER_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=scheduler";
process.env.AUTH_SERVICE_URL = "http://localhost:3009";
process.env.ORCHESTRATOR_SERVICE_URL = "http://localhost:3002";
