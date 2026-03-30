export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CONFIG_ERROR: 2,
  PREFLIGHT_FAILURE: 3,
  SERVICE_STARTUP_FAILURE: 4,
  HEALTH_CHECK_TIMEOUT: 5,
  TEST_EXECUTION_FAILURE: 6,
  CLEANUP_FAILURE: 7,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

export const exitCodeLabel: Record<ExitCode, string> = {
  [ExitCode.SUCCESS]: "success",
  [ExitCode.GENERAL_ERROR]: "general error",
  [ExitCode.CONFIG_ERROR]: "config error",
  [ExitCode.PREFLIGHT_FAILURE]: "preflight failure",
  [ExitCode.SERVICE_STARTUP_FAILURE]: "service startup failure",
  [ExitCode.HEALTH_CHECK_TIMEOUT]: "health check timeout",
  [ExitCode.TEST_EXECUTION_FAILURE]: "test execution failure",
  [ExitCode.CLEANUP_FAILURE]: "cleanup failure",
};
