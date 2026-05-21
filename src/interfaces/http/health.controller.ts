import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get()
  getRoot() {
    return {
      name: "FURY Click Hero API",
      status: "ok",
      endpoints: {
        webhook: "POST /webhook/violation",
        jobStatus: "GET /jobs/:id",
        health: "GET /health"
      }
    };
  }

  @Get("health")
  getHealth() {
    return {
      status: "ok"
    };
  }
}
