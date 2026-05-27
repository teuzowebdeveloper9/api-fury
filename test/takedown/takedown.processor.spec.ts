import type { Job } from "bullmq";

import type {
  DeadLetterJobData,
  DeadLetterQueuePort
} from "../../src/takedown/application/ports/dead-letter-queue.port";
import type {
  TakedownJobData,
  TakedownJobResult
} from "../../src/takedown/application/ports/takedown-queue.port";
import type { ProcessTakedownUseCase } from "../../src/takedown/application/use-cases/process-takedown.use-case";
import { RecordDeadLetterUseCase } from "../../src/takedown/application/use-cases/record-dead-letter.use-case";
import { TakedownProcessor } from "../../src/takedown/interfaces/queue/takedown.processor";
import { TAKEDOWN_JOB_NAME, TAKEDOWN_QUEUE } from "../../src/takedown/takedown.constants";

describe("TakedownProcessor", () => {
  const jobData: TakedownJobData = {
    jobId: `takedown-${"a".repeat(64)}`,
    adId: "ad_dlq_001",
    tenantId: "tenant_dlq",
    violationType: "COMPLIANCE_FAIL",
    severity: "CRITICAL",
    detectedAt: "2026-05-21T14:00:00.000Z"
  };

  it("records a dead-letter job after the final failed attempt", async () => {
    const recordedJobs: DeadLetterJobData[] = [];
    const processor = createProcessor(
      createRecordingDeadLetterQueue(recordedJobs)
    );

    await processor.recordDeadLetterOnFinalFailure(
      createFailedJob(jobData, 3, 3),
      new Error("Meta API timeout")
    );

    expect(recordedJobs).toHaveLength(1);
    const recordedJob = recordedJobs[0];

    if (!recordedJob) {
      throw new Error("Expected a dead-letter job to be recorded");
    }

    expect(recordedJob).toMatchObject({
      originalJobId: jobData.jobId,
      sourceQueue: TAKEDOWN_QUEUE,
      attemptsMade: 3,
      maxAttempts: 3,
      error: "Meta API timeout",
      payload: jobData
    });
    expect(typeof recordedJob.failedAt).toBe("string");
    expect(Number.isNaN(Date.parse(recordedJob.failedAt))).toBe(false);
  });

  it("does not record a dead-letter job while retries remain", async () => {
    const recordedJobs: DeadLetterJobData[] = [];
    const processor = createProcessor(
      createRecordingDeadLetterQueue(recordedJobs)
    );

    await processor.recordDeadLetterOnFinalFailure(
      createFailedJob(jobData, 1, 3),
      new Error("transient Meta API failure")
    );

    expect(recordedJobs).toHaveLength(0);
  });
});

function createRecordingDeadLetterQueue(
  recordedJobs: DeadLetterJobData[]
): DeadLetterQueuePort {
  return {
    enqueueFailedTakedownJob: (job: DeadLetterJobData): Promise<void> => {
      recordedJobs.push(job);
      return Promise.resolve();
    }
  };
}

function createProcessor(queue: DeadLetterQueuePort): TakedownProcessor {
  const processTakedownUseCase = {
    execute: jest.fn()
  } as unknown as ProcessTakedownUseCase;

  return new TakedownProcessor(
    processTakedownUseCase,
    new RecordDeadLetterUseCase(queue)
  );
}

function createFailedJob(
  data: TakedownJobData,
  attemptsMade: number,
  maxAttempts: number
): Job<TakedownJobData, TakedownJobResult, string> {
  return {
    id: data.jobId,
    name: TAKEDOWN_JOB_NAME,
    data,
    attemptsMade,
    opts: {
      attempts: maxAttempts
    }
  } as unknown as Job<TakedownJobData, TakedownJobResult, string>;
}
