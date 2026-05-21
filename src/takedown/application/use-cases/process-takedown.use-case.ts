import type { MetaAdsGateway } from "../ports/meta-ads-gateway.port";
import type {
  TakedownJobData,
  TakedownJobResult
} from "../ports/takedown-queue.port";

export class ProcessTakedownUseCase {
  constructor(private readonly metaAdsGateway: MetaAdsGateway) {}

  async execute(job: TakedownJobData): Promise<TakedownJobResult> {
    return this.metaAdsGateway.requestTakedown(job);
  }
}
