import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export interface SwaggerConfig {
  title: string;
  description: string;
  version?: string;
  path?: string;
  tags?: { name: string; description: string }[];
}

export function setupSwagger(app: INestApplication, config: SwaggerConfig): void {
  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version ?? "1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Gusto session JWT from auth-service",
      },
      "bearer-auth",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "X-Internal-Secret",
        in: "header",
        description: "Internal shared secret for service-to-service calls",
      },
      "internal-secret",
    );

  if (config.tags) {
    for (const tag of config.tags) {
      builder.addTag(tag.name, tag.description);
    }
  }

  const document = SwaggerModule.createDocument(app, builder.build());
  const path = config.path ?? "api/docs";
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });
}
