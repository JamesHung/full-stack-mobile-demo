export interface SmokePlan {
  version: number;
  checks: Record<string, CheckDefinition>;
  rules: PolicyRule[];
  ci_average_duration_s?: number;
}

export interface CheckDefinition {
  command: string;
  timeout_s?: number;
}

export interface PolicyRule {
  paths: string[];
  checks: string[];
}

export interface CheckPlan {
  checks: ResolvedCheck[];
  matchedRules: PolicyRule[];
  changedPaths: string[];
  diffSource: string;
}

export interface ResolvedCheck {
  name: string;
  command: string;
  timeout_s: number;
}

export interface CheckResult {
  name: string;
  command: string;
  status: "passed" | "failed" | "skipped" | "timeout";
  durationMs: number;
  exitCode: number | null;
  error: string | null;
}

export interface MetricEntry {
  timestamp: string;
  trigger: "enforce" | "plan" | "skip";
  checks: string[];
  results?: CheckResult[];
  duration_s: number;
  reason?: string;
  ci_time_saved_s?: number;
}
