import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Cùng alias `@/` → `src/` với tsconfig, để test import được module dùng alias.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
