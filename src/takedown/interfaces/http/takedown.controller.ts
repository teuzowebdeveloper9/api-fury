import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post
} from "@nestjs/common";

import { GetJobStatusUseCase } from "../../application/use-cases/get-job-status.use-case";
import { ReportViolationUseCase } from "../../application/use-cases/report-violation.use-case";
import {
  jobIdParamSchema,
  type JobIdParam,
  type ViolationWebhookPayload,
  violationWebhookSchema
} from "./violation-webhook.schema";
import { ZodValidationPipe } from "./zod-validation.pipe";

@Controller()
export class TakedownController {
  constructor(
    private readonly reportViolationUseCase: ReportViolationUseCase,
    private readonly getJobStatusUseCase: GetJobStatusUseCase
  ) {}

  @Post("webhook/violation")
  @HttpCode(HttpStatus.ACCEPTED)
  async reportViolation(
    @Body(new ZodValidationPipe(violationWebhookSchema))
    payload: ViolationWebhookPayload
  ) {
    return this.reportViolationUseCase.execute(payload);
  }

  @Get("jobs/:id")
  async getJobStatus(
    @Param(new ZodValidationPipe(jobIdParamSchema)) params: JobIdParam
  ) {
    const job = await this.getJobStatusUseCase.execute(params.id);

    if (!job) {
      throw new NotFoundException({
        message: "Job not found"
      });
    }

    return job;
  }
}
