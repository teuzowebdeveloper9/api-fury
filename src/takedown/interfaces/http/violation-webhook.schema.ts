import { z } from "zod";

import { severityLevels, violationTypes } from "../../domain/violation";

export const violationWebhookSchema = z
  .object({
    adId: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    violationType: z.enum(violationTypes),
    severity: z.enum(severityLevels),
    detectedAt: z.string().datetime({ offset: true })
  })
  .strict();

export const jobIdParamSchema = z.object({
  id: z.string().regex(/^takedown-[a-f0-9]{64}$/)
});

export type ViolationWebhookPayload = z.infer<typeof violationWebhookSchema>;
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
