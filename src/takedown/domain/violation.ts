export const violationTypes = [
  "PROHIBITED_TERM",
  "BRAND_VIOLATION",
  "COMPLIANCE_FAIL"
] as const;

export const severityLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type ViolationType = (typeof violationTypes)[number];
export type Severity = (typeof severityLevels)[number];

export interface ViolationReport {
  readonly adId: string;
  readonly tenantId: string;
  readonly violationType: ViolationType;
  readonly severity: Severity;
  readonly detectedAt: string;
}
