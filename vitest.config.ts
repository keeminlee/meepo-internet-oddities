import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["__tests__/**/*.test.ts"],
    // Each test file gets its own worker so the module-level DB singleton in
    // lib/db is isolated without manual cache busting.
    pool: "forks",
    poolOptions: { forks: { singleFork: false } },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
