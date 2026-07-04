import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";

const logger = createLogger("auth-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.info(`AuthService listening on port ${port}`);
}
bootstrap();
