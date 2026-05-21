import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";
import { setupOpenApiDocs } from "./docs/openapi";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https:"],
          fontSrc: ["'self'", "data:", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"]
        }
      }
    })
  );
  app.enableShutdownHooks();
  setupOpenApiDocs(app);

  await app.listen(config.port, config.host);
  Logger.log(`API listening on ${config.host}:${config.port}`, "Bootstrap");
}

void bootstrap();
