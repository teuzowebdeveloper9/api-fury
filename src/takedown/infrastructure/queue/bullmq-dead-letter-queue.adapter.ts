import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

import type {
  DeadLetterJobData,
  DeadLetterQueuePort
} from "../../application/ports/dead-letter-queue.port";
import {
  TAKEDOWN_DEAD_LETTER_JOB_NAME,
  TAKEDOWN_DEAD_LETTER_QUEUE
} from "../../takedown.constants";

@Injectable()
export class BullMqDeadLetterQueueAdapter implements DeadLetterQueuePort {
  constructor(
    @InjectQueue(TAKEDOWN_DEAD_LETTER_QUEUE)
    private readonly queue: Queue<DeadLetterJobData, void, string>
  ) {}

  async enqueueFailedTakedownJob(job: DeadLetterJobData): Promise<void> {
    const deadLetterJobId = toDeadLetterJobId(job.originalJobId);
    const existingJob = await this.queue.getJob(deadLetterJobId);

    if (existingJob) {
      return;
    }

    await this.queue.add(TAKEDOWN_DEAD_LETTER_JOB_NAME, job, {
      jobId: deadLetterJobId,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
      stackTraceLimit: 5
    });
  }
}

function toDeadLetterJobId(originalJobId: string): string {
  return `dead-letter-${originalJobId}`;
}
