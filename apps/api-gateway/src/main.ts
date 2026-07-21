import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { env } from "./config/configuration";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("api-gateway");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const origins = env.CORS_ALLOWED_ORIGINS.split(",").map(o => o.trim());
  app.enableCors({ origin: origins });

  setupSwagger(app, {
    title: "Gusto API Gateway",
    description: "Public-facing API gateway. Proxies auth routes to auth-service. All other routes are JWT-protected.",
    path: "api/docs",
    tags: [
      { name: "Auth", description: "User authentication (proxied to auth-service)" },
    ],
  });

  const port = env.PORT;
  await app.listen(port);
  logger.info(`ApiGateway listening on port ${port}`);
}
bootstrap();
