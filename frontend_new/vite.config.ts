import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

// Vite bundles this config before running Vitest, so import.meta.url isn't the
// source config's location. npm_package_json remains the package's real path.
const frontendRoot = process.env.npm_package_json
  ? path.dirname(process.env.npm_package_json)
  : process.cwd();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow ngrok-hosted access to local Vite dev server for Telegram Web App testing.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", "localhost", "127.0.0.1"],
  },
  resolve: {
    alias: {
      "@": path.join(frontendRoot, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
  },
});
