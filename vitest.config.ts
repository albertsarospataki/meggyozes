import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@meggyozes/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@meggyozes/brand": new URL("./packages/brand/src/index.ts", import.meta.url).pathname,
      "@meggyozes/projekt": new URL("./packages/projekt/src/index.ts", import.meta.url).pathname,
    },
  },
});
