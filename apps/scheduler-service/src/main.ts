import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";

const logger = createLogger("scheduler-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  logger.info(`SchedulerService listening on port ${port}`);
}
bootstrap();
