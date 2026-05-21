import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Job, JobsOptions, Queue } from "bullmq";

import { AppConfigService } from "../../../config/app-config.service";
import type {
  EnqueueTakedownJobResult,
  JobStatusView,
  QueueJobStatus,
  TakedownJobData,
  TakedownJobResult,
  TakedownQueuePort
} from "../../application/ports/takedown-queue.port";
import { TAKEDOWN_JOB_NAME, TAKEDOWN_QUEUE } from "../../takedown.constants";

const knownJobStatuses = new Set<string>([
  "active",
  "completed",
  "delayed",
  "failed",
  "prioritized",
  "paused",
  "unknown",
  "waiting",
  "waiting-children"
]);

@Injectable()
export class BullMqTakedownQueueAdapter implements TakedownQueuePort {
  constructor(
    @InjectQueue(TAKEDOWN_QUEUE)
    private readonly queue: Queue<TakedownJobData, TakedownJobResult, string>,
    private readonly config: AppConfigService
  ) {}

  async enqueueTakedownJob(
    jobData: TakedownJobData
  ): Promise<EnqueueTakedownJobResult> {
    const existingJob = await this.queue.getJob(jobData.jobId);

    if (existingJob) {
      return this.toEnqueueResult(existingJob, true);
    }

    const job = await this.queue.add(
      TAKEDOWN_JOB_NAME,
      jobData,
      this.createJobOptions(jobData.jobId)
    );

    return this.toEnqueueResult(job, false);
  }

  async getJobStatus(jobId: string): Promise<JobStatusView | null> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      jobId: job.id ?? jobId,
      status: toQueueJobStatus(await job.getState()),
      attempts: job.attemptsMade,
      result: job.returnvalue ?? null,
      error: job.failedReason ?? null
    };
  }

  private createJobOptions(jobId: string): JobsOptions {
    return {
      jobId,
      attempts: this.config.takedownJobAttempts,
      backoff: {
        type: "exponential",
        delay: this.config.takedownJobBackoffMs
      },
      removeOnComplete: false,
      removeOnFail: false,
      stackTraceLimit: 5
    };
  }

  private async toEnqueueResult(
    job: Job<TakedownJobData, TakedownJobResult, string>,
    deduplicated: boolean
  ): Promise<EnqueueTakedownJobResult> {
    return {
      jobId: job.id ?? job.data.jobId,
      status: toQueueJobStatus(await job.getState()),
      deduplicated
    };
  }
}

function toQueueJobStatus(status: string): QueueJobStatus {
  if (knownJobStatuses.has(status)) {
    return status as QueueJobStatus;
  }

  return "unknown";
}
