import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("notification-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Notification Service",
    description: "Multi-channel notifications (email, push, SMS) and inbound decision webhooks.",
    path: "api/docs",
    tags: [
      { name: "Dispatch", description: "Send notifications via SES/SNS" },
      { name: "Contact Preferences", description: "User contact preference management" },
      { name: "Inbound", description: "Decision webhooks from user devices" },
    ],
  });

  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  logger.info(`NotificationService listening on port ${port}`);
}
bootstrap();
