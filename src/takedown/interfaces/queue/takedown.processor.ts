import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import type {
  TakedownJobData,
  TakedownJobResult
} from "../../application/ports/takedown-queue.port";
import { ProcessTakedownUseCase } from "../../application/use-cases/process-takedown.use-case";
import { TAKEDOWN_JOB_NAME, TAKEDOWN_QUEUE } from "../../takedown.constants";

@Processor(TAKEDOWN_QUEUE)
export class TakedownProcessor extends WorkerHost {
  private readonly logger = new Logger(TakedownProcessor.name);

  constructor(private readonly processTakedownUseCase: ProcessTakedownUseCase) {
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
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "unknown error";
}
