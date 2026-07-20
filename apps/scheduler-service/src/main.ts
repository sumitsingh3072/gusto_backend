import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("scheduler-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Scheduler Service",
    description: "User schedule configuration for daily meal ordering cron.",
    path: "api/docs",
    tags: [
      { name: "Schedule Config", description: "User schedule preferences (scout/notify/execute times)" },
    ],
  });

  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  logger.info(`SchedulerService listening on port ${port}`);
}
bootstrap();
