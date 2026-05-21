import { ReportViolationUseCase } from "../../src/takedown/application/use-cases/report-violation.use-case";
import type { ViolationReport } from "../../src/takedown/domain/violation";
import type { TakedownQueuePort } from "../../src/takedown/application/ports/takedown-queue.port";

describe("ReportViolationUseCase", () => {
  const violation: ViolationReport = {
    adId: "ad_123",
    tenantId: "tenant_456",
    violationType: "BRAND_VIOLATION",
    severity: "HIGH",
    detectedAt: "2026-05-21T14:00:00.000Z"
  };

  it("enqueues a takedown job using a deterministic idempotency job id", async () => {
    const enqueueTakedownJob = jest.fn(
      (
        job: Parameters<TakedownQueuePort["enqueueTakedownJob"]>[0]
      ): ReturnType<TakedownQueuePort["enqueueTakedownJob"]> =>
        Promise.resolve({
          jobId: job.jobId,
          status: "waiting" as const,
          deduplicated: false
        })
    );

    const queue: TakedownQueuePort = {
      enqueueTakedownJob,
      getJobStatus: jest.fn(() => Promise.resolve(null))
    };

    const useCase = new ReportViolationUseCase(queue);

    const firstResult = await useCase.execute(violation);
    const secondResult = await useCase.execute(violation);

    expect(firstResult.jobId).toBe(secondResult.jobId);
    expect(firstResult.jobId).toMatch(/^takedown-[a-f0-9]{64}$/);
    expect(firstResult.jobId).not.toContain(violation.adId);
    expect(firstResult.jobId).not.toContain(violation.tenantId);
    expect(enqueueTakedownJob).toHaveBeenCalledWith({
      ...violation,
      jobId: firstResult.jobId
    });
  });

  it("does not deduplicate different tenant or ad combinations", async () => {
    const enqueueTakedownJob = jest.fn(
      (
        job: Parameters<TakedownQueuePort["enqueueTakedownJob"]>[0]
      ): ReturnType<TakedownQueuePort["enqueueTakedownJob"]> =>
        Promise.resolve({
          jobId: job.jobId,
          status: "waiting" as const,
          deduplicated: false
        })
    );

    const queue: TakedownQueuePort = {
      enqueueTakedownJob,
      getJobStatus: jest.fn(() => Promise.resolve(null))
    };

    const useCase = new ReportViolationUseCase(queue);

    const baseResult = await useCase.execute(violation);
    const differentTenantResult = await useCase.execute({
      ...violation,
      tenantId: "tenant_789"
    });
    const differentAdResult = await useCase.execute({
      ...violation,
      adId: "ad_789"
    });

    expect(differentTenantResult.jobId).not.toBe(baseResult.jobId);
    expect(differentAdResult.jobId).not.toBe(baseResult.jobId);
    expect(
      new Set([
        baseResult.jobId,
        differentTenantResult.jobId,
        differentAdResult.jobId
      ]).size
    ).toBe(3);
  });
});
