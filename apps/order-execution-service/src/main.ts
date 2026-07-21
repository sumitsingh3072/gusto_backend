import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("order-execution-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Order Execution Service",
    description: "Order lifecycle: execute, confirm, poll delivery status.",
    path: "api/docs",
    tags: [
      { name: "Orders", description: "Order execution, confirmation, and delivery tracking" },
    ],
  });

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  logger.info(`OrderExecutionService listening on port ${port}`);
}
bootstrap();
