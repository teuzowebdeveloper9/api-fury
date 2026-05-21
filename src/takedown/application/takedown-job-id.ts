import { createHash } from "node:crypto";

import type { ViolationReport } from "../domain/violation";

export function createTakedownJobId(
  violation: Pick<ViolationReport, "adId" | "tenantId">
): string {
  const digest = createHash("sha256")
    .update(violation.tenantId)
    .update("\0")
    .update(violation.adId)
    .digest("hex");

  return `takedown-${digest}`;
}
