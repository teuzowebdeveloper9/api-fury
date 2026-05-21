import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

export function setupOpenApiDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("FURY Click Hero API")
    .setDescription(
      "Mini-API para receber violacoes de anuncios, validar payloads, enfileirar jobs BullMQ e processar takedowns com uma chamada HTTP externa simulando a Meta Ads API."
    )
    .setVersion("0.1.0")
    .addTag("Health", "Status operacional da API")
    .addTag("Takedown jobs", "Webhook de violacao e consulta de jobs")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey
  });

  SwaggerModule.setup("openapi", app, document, {
    ui: false,
    raw: ["json"],
    jsonDocumentUrl: "openapi.json"
  });

  app.use(
    "/docs",
    apiReference({
      theme: "purple",
      url: "/openapi.json"
    })
  );
}
