import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { env } from "./config/configuration";

const logger = createLogger("api-gateway");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const origins = env.CORS_ALLOWED_ORIGINS.split(",").map(o => o.trim());
  app.enableCors({
    origin: origins,
  });

  const port = env.PORT;
  await app.listen(port);
  logger.info(`ApiGateway listening on port ${port}`);
}
bootstrap();
