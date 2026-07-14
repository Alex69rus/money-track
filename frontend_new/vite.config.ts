import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow ngrok-hosted access to local Vite dev server for Telegram Web App testing.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", "localhost", "127.0.0.1"],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
  },
});
