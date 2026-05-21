import type {
  JobStatusView,
  TakedownQueuePort
} from "../ports/takedown-queue.port";

export class GetJobStatusUseCase {
  constructor(private readonly takedownQueue: TakedownQueuePort) {}

  async execute(jobId: string): Promise<JobStatusView | null> {
    return this.takedownQueue.getJobStatus(jobId);
  }
}
