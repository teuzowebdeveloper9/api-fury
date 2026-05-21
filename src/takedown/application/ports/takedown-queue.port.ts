import type { ViolationReport } from "../../domain/violation";

export const TAKEDOWN_QUEUE_PORT = Symbol("TAKEDOWN_QUEUE_PORT");

export type QueueJobStatus =
  | "active"
  | "completed"
  | "delayed"
  | "failed"
  | "prioritized"
  | "paused"
  | "unknown"
  | "waiting"
  | "waiting-children";

export interface TakedownJobData extends ViolationReport {
  readonly jobId: string;
}

export interface TakedownJobResult {
  readonly ok: true;
  readonly externalStatus: number;
  readonly processedAt: string;
}

export interface EnqueueTakedownJobResult {
  readonly jobId: string;
  readonly status: QueueJobStatus;
  readonly deduplicated: boolean;
}

export interface JobStatusView {
  readonly jobId: string;
  readonly status: QueueJobStatus;
  readonly attempts: number;
  readonly result: TakedownJobResult | null;
  readonly error: string | null;
}

export interface TakedownQueuePort {
  enqueueTakedownJob(job: TakedownJobData): Promise<EnqueueTakedownJobResult>;
  getJobStatus(jobId: string): Promise<JobStatusView | null>;
}
