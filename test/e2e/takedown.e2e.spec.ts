import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { z } from "zod";

import {
  TAKEDOWN_QUEUE_PORT,
  type EnqueueTakedownJobResult,
  type JobStatusView,
  type TakedownJobData,
  type TakedownQueuePort
} from "../../src/takedown/application/ports/takedown-queue.port";
import { GetJobStatusUseCase } from "../../src/takedown/application/use-cases/get-job-status.use-case";
import { ReportViolationUseCase } from "../../src/takedown/application/use-cases/report-violation.use-case";
import { TakedownController } from "../../src/takedown/interfaces/http/takedown.controller";

const enqueueResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  deduplicated: z.boolean()
});

const validationErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.array(
    z.object({
      path: z.string()
    })
  )
});

const jobStatusResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  attempts: z.number(),
  result: z.unknown().nullable(),
  error: z.string().nullable()
});

const notFoundResponseSchema = z.object({
  message: z.string()
});

class InMemoryTakedownQueue implements TakedownQueuePort {
  private readonly jobs = new Map<string, JobStatusView>();

  enqueueTakedownJob(
    job: TakedownJobData
  ): Promise<EnqueueTakedownJobResult> {
    const existingJob = this.jobs.get(job.jobId);

    if (existingJob) {
      return Promise.resolve({
        jobId: existingJob.jobId,
        status: existingJob.status,
        deduplicated: true
      });
    }

    this.jobs.set(job.jobId, {
      jobId: job.jobId,
      status: "waiting",
      attempts: 0,
      result: null,
      error: null
    });

    return Promise.resolve({
      jobId: job.jobId,
      status: "waiting",
      deduplicated: false
    });
  }

  getJobStatus(jobId: string): Promise<JobStatusView | null> {
    return Promise.resolve(this.jobs.get(jobId) ?? null);
  }
}

describe("Takedown HTTP API (e2e)", () => {
  let app: INestApplication;
  let baseUrl: string;

  const validPayload = {
    adId: "ad_e2e_001",
    tenantId: "tenant_e2e",
    violationType: "BRAND_VIOLATION",
    severity: "HIGH",
    detectedAt: "2026-05-21T14:00:00.000Z"
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TakedownController],
      providers: [
        {
          provide: TAKEDOWN_QUEUE_PORT,
          useClass: InMemoryTakedownQueue
        },
        {
          provide: ReportViolationUseCase,
          useFactory: (queue: TakedownQueuePort) =>
            new ReportViolationUseCase(queue),
          inject: [TAKEDOWN_QUEUE_PORT]
        },
        {
          provide: GetJobStatusUseCase,
          useFactory: (queue: TakedownQueuePort) =>
            new GetJobStatusUseCase(queue),
          inject: [TAKEDOWN_QUEUE_PORT]
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it("accepts a valid violation webhook and returns a job id", async () => {
    const response = await request(baseUrl)
      .post("/webhook/violation")
      .send(validPayload)
      .expect(202);

    const body = enqueueResponseSchema.parse(response.body as unknown);

    expect(body).toMatchObject({
      status: "waiting",
      deduplicated: false
    });
    expect(body.jobId).toMatch(/^takedown-[a-f0-9]{64}$/);
  });

  it("rejects invalid webhook payloads with detailed Zod errors", async () => {
    const response = await request(baseUrl)
      .post("/webhook/violation")
      .send({
        ...validPayload,
        adId: "",
        violationType: "INVALID",
        detectedAt: "not-a-date"
      })
      .expect(400);

    const body = validationErrorResponseSchema.parse(response.body as unknown);

    expect(body).toMatchObject({
      message: "Validation failed"
    });
    expect(body.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["adId", "violationType", "detectedAt"])
    );
  });

  it("keeps duplicate adId and tenantId submissions idempotent", async () => {
    const firstResponse = await request(baseUrl)
      .post("/webhook/violation")
      .send(validPayload)
      .expect(202);

    const secondResponse = await request(baseUrl)
      .post("/webhook/violation")
      .send(validPayload)
      .expect(202);

    const firstBody = enqueueResponseSchema.parse(
      firstResponse.body as unknown
    );
    const secondBody = enqueueResponseSchema.parse(
      secondResponse.body as unknown
    );

    expect(secondBody).toMatchObject({
      jobId: firstBody.jobId,
      deduplicated: true
    });
  });

  it("returns the current queue status for an existing job", async () => {
    const enqueueResponse = await request(baseUrl)
      .post("/webhook/violation")
      .send(validPayload)
      .expect(202);

    const enqueueBody = enqueueResponseSchema.parse(
      enqueueResponse.body as unknown
    );

    const statusResponse = await request(baseUrl)
      .get(`/jobs/${enqueueBody.jobId}`)
      .expect(200);

    const statusBody = jobStatusResponseSchema.parse(
      statusResponse.body as unknown
    );

    expect(statusBody).toEqual({
      jobId: enqueueBody.jobId,
      status: "waiting",
      attempts: 0,
      result: null,
      error: null
    });
  });

  it("rejects malformed job ids before querying the queue", async () => {
    const response = await request(baseUrl)
      .get("/jobs/not-a-job-id")
      .expect(400);

    const body = validationErrorResponseSchema.parse(response.body as unknown);

    expect(body).toMatchObject({
      message: "Validation failed"
    });
    expect(body.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["id"])
    );
  });

  it("returns 404 for a well-formed unknown job id", async () => {
    const unknownJobId = `takedown-${"0".repeat(64)}`;

    const response = await request(baseUrl)
      .get(`/jobs/${unknownJobId}`)
      .expect(404);

    const body = notFoundResponseSchema.parse(response.body as unknown);

    expect(body).toEqual({
      message: "Job not found"
    });
  });
});
