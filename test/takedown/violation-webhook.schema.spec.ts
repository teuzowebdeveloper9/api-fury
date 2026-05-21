import { violationWebhookSchema } from "../../src/takedown/interfaces/http/violation-webhook.schema";

describe("violationWebhookSchema", () => {
  it("rejects invalid webhook payloads with field-level issues", () => {
    const result = violationWebhookSchema.safeParse({
      adId: "",
      tenantId: "tenant_456",
      violationType: "UNKNOWN",
      severity: "HIGH",
      detectedAt: "not-a-date"
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["adId", "violationType", "detectedAt"])
      );
    }
  });
});
