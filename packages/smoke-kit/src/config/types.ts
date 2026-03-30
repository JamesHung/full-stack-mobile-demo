export interface ServiceConfig {
  name: string;
  command: string;
  port?: number;
  healthPath?: string;
  healthTimeout?: number;
  retryInterval?: number;
  logFile?: string;
  env?: Record<string, string>;
}

export interface MetroConfig {
  port: number;
  host?: string;
  healthPath?: string;
  healthTimeout?: number;
  command?: string;
  logFile?: string;
  env?: Record<string, string>;
}

export interface FlowConfig {
  directory: string;
  androidFlow?: string;
  iosFlow?: string;
  canonicalFlow?: string;
}

export interface ArtifactConfig {
  outputRoot: string;
  junitFile?: string;
  summaryFile?: string;
}

export interface HealthCheckDefaults {
  timeout?: number;
  retryInterval?: number;
  httpMethod?: "GET" | "HEAD";
}

export interface EmulatorConfig {
  avd?: string;
  bootTimeout?: number;
}

export interface SmokeConfig {
  $schema?: string;
  version: string;
  appId: string;
  appRoot: string;
  backendRoot?: string;
  platforms: Array<"android" | "ios">;
  services: ServiceConfig[];
  metro: MetroConfig;
  flows: FlowConfig;
  artifacts: ArtifactConfig;
  healthCheck?: HealthCheckDefaults;
  emulator?: EmulatorConfig;
}

export interface StageResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  exitCode: number;
  durationMs: number;
  error: string | null;
}

export interface SmokeRun {
  runId: string;
  platform: "android" | "ios";
  mode: "local" | "ci";
  startedAt: string;
  completedAt: string;
  stages: StageResult[];
  exitCode: number;
  artifactPaths: Record<string, string>;
}

export interface ErrorSummary {
  stage: string;
  exitCode: number;
  durationMs: number;
  serviceName: string | null;
  logTail: string[];
  renderedText: string;
  renderedMarkdown: string;
}
