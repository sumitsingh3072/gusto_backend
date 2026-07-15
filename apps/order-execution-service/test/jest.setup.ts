// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.ORDER_EXECUTION_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=order_execution";
process.env.MCP_GATEWAY_SERVICE_URL = "http://localhost:3008";
process.env.ESCROW_SERVICE_URL = "http://localhost:3005";
process.env.NOTIFICATION_SERVICE_URL = "http://localhost:3007";
process.env.ORDER_EXECUTION_CART_OPTIMIZED_QUEUE_URL = "http://localhost:4566/000000000000/test-cart-optimized";
process.env.ORDER_EXECUTION_MEAL_APPROVED_QUEUE_URL = "http://localhost:4566/000000000000/test-meal-approved";
