import { describe, it, expect } from "vitest";
import { ExitCode } from "../../src/utils/exit-codes.js";

describe("pipeline exit codes", () => {
  it("defines correct exit codes per contract", () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBe(1);
    expect(ExitCode.CONFIG_ERROR).toBe(2);
    expect(ExitCode.PREFLIGHT_FAILURE).toBe(3);
    expect(ExitCode.SERVICE_STARTUP_FAILURE).toBe(4);
    expect(ExitCode.HEALTH_CHECK_TIMEOUT).toBe(5);
    expect(ExitCode.TEST_EXECUTION_FAILURE).toBe(6);
    expect(ExitCode.CLEANUP_FAILURE).toBe(7);
  });
});
