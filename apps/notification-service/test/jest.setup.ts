// Runs before the test framework and before any test file's imports, so
// configuration.ts's module-level envSchema.parse(process.env) succeeds
// when test files (transitively) import services that read `env`.
process.env.NODE_ENV = "test";
process.env.EVENT_BUS_ENDPOINT = "http://localhost:4566";
process.env.EVENT_BUS_REGION = "ap-south-1";
process.env.NOTIFICATION_DATABASE_URL = "postgresql://gusto:password@localhost:5432/gusto?schema=notification";
process.env.ORCHESTRATOR_SERVICE_URL = "http://localhost:3002";
process.env.SES_FROM_EMAIL_ADDRESS = "noreply@gusto.dev";
process.env.NOTIFICATION_MENU_PROPOSED_QUEUE_URL = "http://localhost:4566/000000000000/test-menu-proposed";
process.env.NOTIFICATION_ORDER_PLACED_QUEUE_URL = "http://localhost:4566/000000000000/test-order-placed";
process.env.NOTIFICATION_ORDER_DELIVERED_QUEUE_URL = "http://localhost:4566/000000000000/test-order-delivered";
process.env.SNS_IOS_PLATFORM_APPLICATION_ARN = "arn:aws:sns:platform-ios";
process.env.SNS_ANDROID_PLATFORM_APPLICATION_ARN = "arn:aws:sns:platform-android";
