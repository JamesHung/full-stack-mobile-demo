export const smokePlanSchema = {
  $id: "https://smoke-kit.dev/schemas/smoke-plan-v1.json",
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Smoke Plan",
  description: "Path-to-check matrix for smoke-kit policy engine",
  type: "object" as const,
  required: ["version", "checks", "rules"],
  additionalProperties: false,
  properties: {
    version: {
      type: "number" as const,
      enum: [1],
      description: "Schema version",
    },
    checks: {
      type: "object" as const,
      minProperties: 1,
      additionalProperties: {
        type: "object" as const,
        required: ["command"],
        additionalProperties: false,
        properties: {
          command: {
            type: "string" as const,
            minLength: 1,
          },
          timeout_s: {
            type: "number" as const,
            minimum: 1,
            maximum: 3600,
          },
        },
      },
    },
    rules: {
      type: "array" as const,
      minItems: 1,
      items: {
        type: "object" as const,
        required: ["paths", "checks"],
        additionalProperties: false,
        properties: {
          paths: {
            type: "array" as const,
            minItems: 1,
            items: { type: "string" as const, minLength: 1 },
          },
          checks: {
            type: "array" as const,
            minItems: 1,
            items: { type: "string" as const, minLength: 1 },
          },
        },
      },
    },
    ci_average_duration_s: {
      type: "number" as const,
      minimum: 0,
    },
  },
};
