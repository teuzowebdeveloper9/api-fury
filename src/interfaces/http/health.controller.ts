import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller()
export class HealthController {
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
  @ApiOperation({ summary: "Health check simples" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok"
      }
    }
  })
  getHealth() {
    return {
      status: "ok"
    };
  }
}
