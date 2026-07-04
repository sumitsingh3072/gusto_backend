import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";

const logger = createLogger("orchestrator-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  logger.info(`OrchestratorService listening on port ${port}`);
}
bootstrap();
