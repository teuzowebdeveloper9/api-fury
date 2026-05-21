import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import type {
  EnqueueTakedownJobResult,
  JobStatusView
} from "../../application/ports/takedown-queue.port";
import { GetJobStatusUseCase } from "../../application/use-cases/get-job-status.use-case";
import { ReportViolationUseCase } from "../../application/use-cases/report-violation.use-case";
import {
  EnqueueTakedownResponseDoc,
  JobStatusResponseDoc,
  NotFoundResponseDoc,
  ValidationErrorResponseDoc,
  ViolationWebhookRequestDoc
} from "./takedown-docs.dto";
import {
  jobIdParamSchema,
  type JobIdParam,
  type ViolationWebhookPayload,
  violationWebhookSchema
} from "./violation-webhook.schema";
import { ZodValidationPipe } from "./zod-validation.pipe";

@ApiTags("Takedown jobs")
@Controller()
export class TakedownController {
  private readonly logger = new Logger(TakedownController.name);

  constructor(
    private readonly reportViolationUseCase: ReportViolationUseCase,
    private readonly getJobStatusUseCase: GetJobStatusUseCase
  ) {}

  @Post("webhook/violation")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Recebe uma violacao de anuncio e enfileira um takedown"
  })
  @ApiBody({ type: ViolationWebhookRequestDoc })
  @ApiAcceptedResponse({
    type: EnqueueTakedownResponseDoc,
    description: "Job aceito pela fila BullMQ."
  })
  @ApiBadRequestResponse({
    type: ValidationErrorResponseDoc,
    description: "Payload invalido, com erros detalhados por campo."
  })
  async reportViolation(
    @Body(new ZodValidationPipe(violationWebhookSchema))
    payload: ViolationWebhookPayload
  ): Promise<EnqueueTakedownJobResult> {
    this.logger.log(
      `Violation webhook received with type=${payload.violationType} severity=${payload.severity}`
    );

    const result = await this.reportViolationUseCase.execute(payload);

    this.logger.log(
      `Takedown job ${result.jobId} accepted with status=${result.status} deduplicated=${result.deduplicated}`
    );

    return result;
  }

  @Get("jobs/:id")
  @ApiOperation({ summary: "Consulta o status atual de um job de takedown" })
  @ApiParam({
    name: "id",
    example:
      "takedown-7f4f372517f794c215145c728940cf6d48837708065410f168200edebed84435"
  })
  @ApiOkResponse({
    type: JobStatusResponseDoc,
    description: "Status atual do job na fila."
  })
  @ApiBadRequestResponse({
    type: ValidationErrorResponseDoc,
    description: "Formato de jobId invalido."
  })
  @ApiNotFoundResponse({
    type: NotFoundResponseDoc,
    description: "Job nao encontrado."
  })
  async getJobStatus(
    @Param(new ZodValidationPipe(jobIdParamSchema)) params: JobIdParam
  ): Promise<JobStatusView> {
    this.logger.log(`Job status requested for jobId=${params.id}`);

    const job = await this.getJobStatusUseCase.execute(params.id);

    if (!job) {
      this.logger.warn(`Job status not found for jobId=${params.id}`);

      throw new NotFoundException({
        message: "Job not found"
      });
    }

    this.logger.log(
      `Job status returned for jobId=${job.jobId} status=${job.status} attempts=${job.attempts}`
    );

    return job;
  }
}
