import { ApiProperty } from "@nestjs/swagger";

import { severityLevels, violationTypes } from "../../domain/violation";

export class ViolationWebhookRequestDoc {
  @ApiProperty({ example: "ad_123" })
  adId!: string;

  @ApiProperty({ example: "tenant_456" })
  tenantId!: string;

  @ApiProperty({
    enum: violationTypes,
    example: "BRAND_VIOLATION"
  })
  violationType!: string;

  @ApiProperty({
    enum: severityLevels,
    example: "HIGH"
  })
  severity!: string;

  @ApiProperty({
    example: "2026-05-21T14:00:00.000Z",
    format: "date-time"
  })
  detectedAt!: string;
}

export class EnqueueTakedownResponseDoc {
  @ApiProperty({
    example:
      "takedown-7f4f372517f794c215145c728940cf6d48837708065410f168200edebed84435"
  })
  jobId!: string;

  @ApiProperty({ example: "waiting" })
  status!: string;

  @ApiProperty({ example: false })
  deduplicated!: boolean;
}

export class TakedownJobResultDoc {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ example: 200 })
  externalStatus!: number;

  @ApiProperty({
    example: "2026-05-21T15:41:14.027Z",
    format: "date-time"
  })
  processedAt!: string;
}

export class JobStatusResponseDoc {
  @ApiProperty({
    example:
      "takedown-7f4f372517f794c215145c728940cf6d48837708065410f168200edebed84435"
  })
  jobId!: string;

  @ApiProperty({ example: "completed" })
  status!: string;

  @ApiProperty({ example: 1 })
  attempts!: number;

  @ApiProperty({ nullable: true, type: TakedownJobResultDoc })
  result!: TakedownJobResultDoc | null;

  @ApiProperty({ example: null, nullable: true })
  error!: string | null;
}

export class ValidationIssueDoc {
  @ApiProperty({ example: "adId" })
  path!: string;

  @ApiProperty({ example: "too_small" })
  code!: string;

  @ApiProperty({
    example: "Too small: expected string to have >=1 characters"
  })
  message!: string;
}

export class ValidationErrorResponseDoc {
  @ApiProperty({ example: "Validation failed" })
  message!: string;

  @ApiProperty({ type: [ValidationIssueDoc] })
  errors!: ValidationIssueDoc[];
}

export class NotFoundResponseDoc {
  @ApiProperty({ example: "Job not found" })
  message!: string;
}
