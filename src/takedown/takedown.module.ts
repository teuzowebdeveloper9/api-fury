import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { EnvironmentModule } from "../config/environment.module";
import {
  META_ADS_GATEWAY,
  type MetaAdsGateway
} from "./application/ports/meta-ads-gateway.port";
import {
  TAKEDOWN_QUEUE_PORT,
  type TakedownQueuePort
} from "./application/ports/takedown-queue.port";
import { GetJobStatusUseCase } from "./application/use-cases/get-job-status.use-case";
import { ProcessTakedownUseCase } from "./application/use-cases/process-takedown.use-case";
import { ReportViolationUseCase } from "./application/use-cases/report-violation.use-case";
import { JsonPlaceholderMetaAdsGateway } from "./infrastructure/http/jsonplaceholder-meta-ads.gateway";
import { BullMqTakedownQueueAdapter } from "./infrastructure/queue/bullmq-takedown-queue.adapter";
import { TakedownController } from "./interfaces/http/takedown.controller";
import { TakedownProcessor } from "./interfaces/queue/takedown.processor";
import { TAKEDOWN_QUEUE } from "./takedown.constants";

@Module({
  imports: [
    EnvironmentModule,
    BullModule.registerQueue({
      name: TAKEDOWN_QUEUE
    })
  ],
  controllers: [TakedownController],
  providers: [
    BullMqTakedownQueueAdapter,
    JsonPlaceholderMetaAdsGateway,
    TakedownProcessor,
    {
      provide: TAKEDOWN_QUEUE_PORT,
      useExisting: BullMqTakedownQueueAdapter
    },
    {
      provide: META_ADS_GATEWAY,
      useExisting: JsonPlaceholderMetaAdsGateway
    },
    {
      provide: ReportViolationUseCase,
      useFactory: (queue: TakedownQueuePort) =>
        new ReportViolationUseCase(queue),
      inject: [TAKEDOWN_QUEUE_PORT]
    },
    {
      provide: GetJobStatusUseCase,
      useFactory: (queue: TakedownQueuePort) => new GetJobStatusUseCase(queue),
      inject: [TAKEDOWN_QUEUE_PORT]
    },
    {
      provide: ProcessTakedownUseCase,
      useFactory: (gateway: MetaAdsGateway) =>
        new ProcessTakedownUseCase(gateway),
      inject: [META_ADS_GATEWAY]
    }
  ]
})
export class TakedownModule {}
