import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { EnvironmentModule } from "../config/environment.module";
import { HealthController } from "../interfaces/http/health.controller";
import {
  DEAD_LETTER_QUEUE_PORT,
  type DeadLetterQueuePort
} from "./application/ports/dead-letter-queue.port";
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
import { RecordDeadLetterUseCase } from "./application/use-cases/record-dead-letter.use-case";
import { ReportViolationUseCase } from "./application/use-cases/report-violation.use-case";
import { JsonPlaceholderMetaAdsGateway } from "./infrastructure/http/jsonplaceholder-meta-ads.gateway";
import { BullMqDeadLetterQueueAdapter } from "./infrastructure/queue/bullmq-dead-letter-queue.adapter";
import { BullMqTakedownQueueAdapter } from "./infrastructure/queue/bullmq-takedown-queue.adapter";
import { TakedownController } from "./interfaces/http/takedown.controller";
import { TakedownProcessor } from "./interfaces/queue/takedown.processor";
import { TAKEDOWN_DEAD_LETTER_QUEUE, TAKEDOWN_QUEUE } from "./takedown.constants";

@Module({
  imports: [
    EnvironmentModule,
    BullModule.registerQueue(
      {
        name: TAKEDOWN_QUEUE
      },
      {
        name: TAKEDOWN_DEAD_LETTER_QUEUE
      }
    )
  ],
  controllers: [HealthController, TakedownController],
  providers: [
    BullMqDeadLetterQueueAdapter,
    BullMqTakedownQueueAdapter,
    JsonPlaceholderMetaAdsGateway,
    TakedownProcessor,
    {
      provide: DEAD_LETTER_QUEUE_PORT,
      useExisting: BullMqDeadLetterQueueAdapter
    },
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
    },
    {
      provide: RecordDeadLetterUseCase,
      useFactory: (queue: DeadLetterQueuePort) =>
        new RecordDeadLetterUseCase(queue),
      inject: [DEAD_LETTER_QUEUE_PORT]
    }
  ]
})
export class TakedownModule {}
