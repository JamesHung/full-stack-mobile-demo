import { describe, it, expect } from "vitest";
import { smokePlanSchema } from "../../src/policy/schema.js";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(smokePlanSchema);

describe("smokePlanSchema", () => {
  it("validates a minimal valid plan", () => {
    const plan = {
      version: 1,
      checks: {
        lint: { command: "pnpm run lint" },
      },
      rules: [
        { paths: ["src/**"], checks: ["lint"] },
      ],
    };
    expect(validate(plan)).toBe(true);
  });

  it("validates a full plan with all fields", () => {
    const plan = {
      version: 1,
      checks: {
        lint: { command: "pnpm run lint", timeout_s: 60 },
        test: { command: "vitest run", timeout_s: 120 },
      },
      rules: [
        { paths: ["src/**", "lib/**"], checks: ["lint", "test"] },
      ],
      ci_average_duration_s: 720,
    };
    expect(validate(plan)).toBe(true);
  });

  it("rejects version 2", () => {
    const plan = {
      version: 2,
      checks: { lint: { command: "pnpm lint" } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects missing checks", () => {
    const plan = {
      version: 1,
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects missing rules", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects empty checks object", () => {
    const plan = {
      version: 1,
      checks: {},
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects empty rules array", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
      rules: [],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects check with missing command", () => {
    const plan = {
      version: 1,
      checks: { lint: { timeout_s: 60 } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects empty command string", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "" } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects timeout_s of 0", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint", timeout_s: 0 } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects timeout_s over 3600", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint", timeout_s: 7200 } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects additional properties", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
      extra_field: true,
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects rule with empty paths", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
      rules: [{ paths: [], checks: ["lint"] }],
    };
    expect(validate(plan)).toBe(false);
  });

  it("rejects rule with empty checks array", () => {
    const plan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
      rules: [{ paths: ["**"], checks: [] }],
    };
    expect(validate(plan)).toBe(false);
  });
});
