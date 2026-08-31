import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/helpers/globalSetup.ts"],
    setupFiles: ["tests/integration/helpers/setup.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
