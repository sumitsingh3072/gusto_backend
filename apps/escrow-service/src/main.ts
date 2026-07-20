import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("escrow-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto Escrow Service",
    description: "Deposit wallet: balance management, reservation hold/capture/release, rollover.",
    path: "api/docs",
    tags: [
      { name: "Wallet", description: "Deposits, debits, reservations, and balance queries" },
    ],
  });

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  logger.info(`EscrowService listening on port ${port}`);
}
bootstrap();
