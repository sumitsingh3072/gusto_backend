import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("orchestrator-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Orchestrator Service",
    description: "Workflow engine: scout → notify → decide → execute lifecycle.",
    path: "api/docs",
    tags: [
      { name: "Workflow", description: "Scout, notify, finalize, and decision handling" },
    ],
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  logger.info(`OrchestratorService listening on port ${port}`);
}
bootstrap();
