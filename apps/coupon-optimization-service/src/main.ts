import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("coupon-optimization-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Coupon Optimization Service",
    description: "Cart optimization with coupon hacking to minimize total cost.",
    path: "api/docs",
    tags: [
      { name: "Optimize", description: "Cart optimization and coupon application" },
    ],
  });

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.info(`CouponOptimizationService listening on port ${port}`);
}
bootstrap();
