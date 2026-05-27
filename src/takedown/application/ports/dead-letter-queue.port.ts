import type { TakedownJobData } from "./takedown-queue.port";

export const DEAD_LETTER_QUEUE_PORT = Symbol("DEAD_LETTER_QUEUE_PORT");

export interface DeadLetterJobData {
  readonly originalJobId: string;
  readonly sourceQueue: string;
  readonly failedAt: string;
  readonly attemptsMade: number;
  readonly maxAttempts: number;
  readonly error: string;
  readonly payload: TakedownJobData;
}

export interface DeadLetterQueuePort {
  enqueueFailedTakedownJob(job: DeadLetterJobData): Promise<void>;
}
