import type { ViolationReport } from "../../domain/violation";
import type {
  EnqueueTakedownJobResult,
  TakedownQueuePort
} from "../ports/takedown-queue.port";
import { createTakedownJobId } from "../takedown-job-id";

export class ReportViolationUseCase {
  constructor(private readonly takedownQueue: TakedownQueuePort) {}

  async execute(violation: ViolationReport): Promise<EnqueueTakedownJobResult> {
    const jobId = createTakedownJobId(violation);

    return this.takedownQueue.enqueueTakedownJob({
      ...violation,
      jobId
    });
  }
}
