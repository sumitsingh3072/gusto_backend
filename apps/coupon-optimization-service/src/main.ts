import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.info(`CouponOptimizationService listening on port ${port}`);
}
bootstrap();
