import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@voice-notes/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "react-native": fileURLToPath(new URL("./tests/mocks/react-native.ts", import.meta.url)),
      "expo-router": fileURLToPath(new URL("./tests/mocks/expo-router.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/shared/src/**/*.ts", "app/**/*.ts", "app/**/*.tsx"],
    },
  },
});
