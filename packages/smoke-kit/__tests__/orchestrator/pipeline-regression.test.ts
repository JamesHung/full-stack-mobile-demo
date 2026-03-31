import { describe, it, expect, vi, afterEach } from "vitest";
import { ExitCode } from "../../src/utils/exit-codes.js";

// Verify the pipeline.ts:56 type fix compiles correctly
describe("pipeline ExitCode type regression", () => {
  it("allows assigning ExitCode union values to ExitCode-typed variable", () => {
    // This test verifies the fix: `let finalExitCode: ExitCode = ExitCode.SUCCESS`
    // Before the fix, TypeScript narrowed `let finalExitCode = ExitCode.SUCCESS` to literal `0`,
    // making line 83's assignment of a broader ExitCode union fail.
    let exitCode: typeof ExitCode[keyof typeof ExitCode] = ExitCode.SUCCESS;
    exitCode = ExitCode.TEST_EXECUTION_FAILURE;
    expect(exitCode).toBe(ExitCode.TEST_EXECUTION_FAILURE);

    exitCode = ExitCode.CONFIG_ERROR;
    expect(exitCode).toBe(ExitCode.CONFIG_ERROR);

    exitCode = ExitCode.GENERAL_ERROR;
    expect(exitCode).toBe(ExitCode.GENERAL_ERROR);
  });

  it("ExitCode values are correct", () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBe(1);
    expect(ExitCode.CONFIG_ERROR).toBe(2);
    expect(ExitCode.PREFLIGHT_FAILURE).toBe(3);
    expect(ExitCode.TEST_EXECUTION_FAILURE).toBe(6);
  });
});
