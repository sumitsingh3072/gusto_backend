// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.ESCROW_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=escrow";
process.env.ESCROW_ORDER_PLACED_QUEUE_URL = "http://localhost:4566/000000000000/test-order-placed";
process.env.ESCROW_MEAL_SKIPPED_QUEUE_URL = "http://localhost:4566/000000000000/test-meal-skipped";
