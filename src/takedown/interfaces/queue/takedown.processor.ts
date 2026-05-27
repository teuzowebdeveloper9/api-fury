import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import type {
  TakedownJobData,
  TakedownJobResult
} from "../../application/ports/takedown-queue.port";
import { ProcessTakedownUseCase } from "../../application/use-cases/process-takedown.use-case";
import { RecordDeadLetterUseCase } from "../../application/use-cases/record-dead-letter.use-case";
import { TAKEDOWN_JOB_NAME, TAKEDOWN_QUEUE } from "../../takedown.constants";

@Processor(TAKEDOWN_QUEUE)
export class TakedownProcessor extends WorkerHost {
  private readonly logger = new Logger(TakedownProcessor.name);

  constructor(
    private readonly processTakedownUseCase: ProcessTakedownUseCase,
    private readonly recordDeadLetterUseCase: RecordDeadLetterUseCase
  ) {
    super();
  }

  override async process(
    job: Job<TakedownJobData, TakedownJobResult, string>
  ): Promise<TakedownJobResult> {
    if (job.name !== TAKEDOWN_JOB_NAME) {
      throw new Error(`Unsupported job name: ${job.name}`);
    }

    this.logger.log(
      `Processing takedown job ${job.id ?? job.data.jobId} attempt=${job.attemptsMade + 1}`
    );

    try {
      const result = await this.processTakedownUseCase.execute(job.data);
      this.logger.log(
        `Takedown job ${job.id ?? job.data.jobId} completed with external status ${result.externalStatus}`
      );
      return result;
    } catch (error: unknown) {
      this.logger.warn(
        `Takedown job ${job.id ?? job.data.jobId} failed: ${getErrorMessage(error)}`
      );
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  async recordDeadLetterOnFinalFailure(
    job: Job<TakedownJobData, TakedownJobResult, string> | undefined,
    error: Error
  ): Promise<void> {
    if (!job) {
      this.logger.warn("A takedown job failed without job metadata");
      return;
    }

    if (job.name !== TAKEDOWN_JOB_NAME) {
      return;
    }

    const maxAttempts = getConfiguredAttempts(job);
    const originalJobId = job.id ?? job.data.jobId;
    const errorMessage = getErrorMessage(error);

    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Takedown job ${originalJobId} failed attempt ${job.attemptsMade}/${maxAttempts}: ${errorMessage}`
      );
      return;
    }

    await this.recordDeadLetterUseCase.execute({
      originalJobId,
      sourceQueue: TAKEDOWN_QUEUE,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade,
      maxAttempts,
      error: errorMessage,
      payload: job.data
    });

    this.logger.error(
      `Takedown job ${originalJobId} exhausted ${job.attemptsMade}/${maxAttempts} attempts and was moved to the dead-letter queue: ${errorMessage}`
    );
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "unknown error";
}

function getConfiguredAttempts(
  job: Job<TakedownJobData, TakedownJobResult, string>
): number {
  const attempts = job.opts.attempts;

  if (typeof attempts === "number" && Number.isFinite(attempts) && attempts > 0) {
    return attempts;
  }

  return 1;
}
