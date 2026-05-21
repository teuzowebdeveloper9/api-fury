import type { TakedownJobData, TakedownJobResult } from "./takedown-queue.port";

export const META_ADS_GATEWAY = Symbol("META_ADS_GATEWAY");

export interface MetaAdsGateway {
  requestTakedown(job: TakedownJobData): Promise<TakedownJobResult>;
}
