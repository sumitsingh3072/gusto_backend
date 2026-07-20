import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("auth-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Auth Service",
    description: "OAuth 2.1 + PKCE flow with Swiggy, session JWT management, and internal token vault.",
    path: "api/docs",
    tags: [
      { name: "Auth", description: "User authentication (login, logout, token refresh)" },
      { name: "Internal", description: "Service-to-service endpoints (require X-Internal-Secret)" },
    ],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.info(`AuthService listening on port ${port}`);
}
bootstrap();
