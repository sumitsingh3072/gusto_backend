import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { createLogger } from "@gusto/logger";
import { setupSwagger } from "@gusto/swagger";

const logger = createLogger("mcp-gateway-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  setupSwagger(app, {
    title: "Gusto MCP Gateway Service",
    description: "Swiggy MCP tool proxy. Routes tool calls to Swiggy's Food, Instamart, and Dineout MCP servers.",
    path: "api/docs",
    tags: [
      { name: "Food MCP", description: "Swiggy Food MCP tool proxy (search, cart, order, track)" },
      { name: "Instamart MCP", description: "Swiggy Instamart MCP tool proxy (reserved)" },
      { name: "Dineout MCP", description: "Swiggy Dineout MCP tool proxy (reserved)" },
    ],
  });

  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  logger.info(`McpGatewayService listening on port ${port}`);
}
bootstrap();
