import type {
  DeadLetterJobData,
  DeadLetterQueuePort
} from "../ports/dead-letter-queue.port";

export class RecordDeadLetterUseCase {
  constructor(private readonly deadLetterQueue: DeadLetterQueuePort) {}

  execute(job: DeadLetterJobData): Promise<void> {
    return this.deadLetterQueue.enqueueFailedTakedownJob(job);
  }
}
