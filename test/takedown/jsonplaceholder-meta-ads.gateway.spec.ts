import { AppConfigService } from "../../src/config/app-config.service";
import type { TakedownJobData } from "../../src/takedown/application/ports/takedown-queue.port";
import { JsonPlaceholderMetaAdsGateway } from "../../src/takedown/infrastructure/http/jsonplaceholder-meta-ads.gateway";

describe("JsonPlaceholderMetaAdsGateway", () => {
  const originalEnv = process.env;
  const job: TakedownJobData = {
    jobId: "takedown-test",
    adId: "ad_123",
    tenantId: "tenant_456",
    violationType: "BRAND_VIOLATION",
    severity: "HIGH",
    detectedAt: "2026-05-21T14:00:00.000Z"
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      META_API_SIMULATION_URL: "https://jsonplaceholder.typicode.com/posts/1",
      META_API_TIMEOUT_MS: "10"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("returns a successful takedown result for 2xx responses", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const gateway = new JsonPlaceholderMetaAdsGateway(new AppConfigService());

    await expect(gateway.requestTakedown(job)).resolves.toMatchObject({
      ok: true,
      externalStatus: 200
    });
  });

  it("throws a controlled error for non-2xx responses", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }));

    const gateway = new JsonPlaceholderMetaAdsGateway(new AppConfigService());

    await expect(gateway.requestTakedown(job)).rejects.toThrow(
      "Meta API simulation failed with HTTP status 500"
    );
  });

  it("throws a controlled error for timeouts", async () => {
    const abortError = new Error("operation aborted");
    abortError.name = "AbortError";
    jest.spyOn(globalThis, "fetch").mockRejectedValue(abortError);

    const gateway = new JsonPlaceholderMetaAdsGateway(new AppConfigService());

    await expect(gateway.requestTakedown(job)).rejects.toThrow(
      "Meta API simulation timed out after 10ms"
    );
  });
});
