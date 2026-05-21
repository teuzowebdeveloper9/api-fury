import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Queue } from "bullmq";

import { AppConfigService } from "../../config/app-config.service";
import type {
  TakedownJobData,
  TakedownJobResult
} from "../../takedown/application/ports/takedown-queue.port";
import { TAKEDOWN_QUEUE } from "../../takedown/takedown.constants";

type ServiceStatus = "ok" | "error";

interface HealthResponse {
  readonly status: "ok" | "degraded";
  readonly services: {
    readonly api: ServiceStatus;
    readonly redis: {
      readonly status: ServiceStatus;
      readonly message: string;
    };
    readonly externalApi: {
      readonly status: ServiceStatus;
      readonly host: string;
    };
  };
}

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(
    @InjectQueue(TAKEDOWN_QUEUE)
    private readonly queue: Queue<TakedownJobData, TakedownJobResult, string>,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "Retorna informacoes basicas da API" })
  @ApiOkResponse({
    schema: {
      example: {
        name: "FURY Click Hero API",
        status: "ok",
        endpoints: {
          webhook: "POST /webhook/violation",
          jobStatus: "GET /jobs/:id",
          health: "GET /health",
          docs: "GET /docs",
          openapi: "GET /openapi.json"
        }
      }
    }
  })
  getRoot() {
    return {
      name: "FURY Click Hero API",
      status: "ok",
      endpoints: {
        webhook: "POST /webhook/violation",
        jobStatus: "GET /jobs/:id",
        health: "GET /health",
        docs: "GET /docs",
        openapi: "GET /openapi.json"
      }
    };
  }

  @Get("health")
  @ApiOperation({ summary: "Health check operacional da API" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok",
        services: {
          api: "ok",
          redis: {
            status: "ok",
            message: "PONG"
          },
          externalApi: {
            status: "ok",
            host: "jsonplaceholder.typicode.com"
          }
        }
      }
    }
  })
  async getHealth(): Promise<HealthResponse> {
    const redis = await this.checkRedis();
    const externalApi = this.checkExternalApiConfig();

    return {
      status:
        redis.status === "ok" && externalApi.status === "ok"
          ? "ok"
          : "degraded",
      services: {
        api: "ok",
        redis,
        externalApi
      }
    };
  }

  private async checkRedis(): Promise<HealthResponse["services"]["redis"]> {
    try {
      const client = await this.queue.client;
      const message = await client.ping();

      return {
        status: "ok",
        message
      };
    } catch (error: unknown) {
      return {
        status: "error",
        message: getErrorMessage(error)
      };
    }
  }

  private checkExternalApiConfig(): HealthResponse["services"]["externalApi"] {
    try {
      const url = new URL(this.config.metaApiSimulationUrl);

      return {
        status: "ok",
        host: url.host
      };
    } catch {
      return {
        status: "error",
        host: "invalid-url"
      };
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "unknown error";
}
