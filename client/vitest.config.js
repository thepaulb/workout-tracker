import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Client test suite — React components, hooks, context and api modules,
// run in jsdom with Testing Library. Kept separate from vite.config.js so
// the dev-server proxy config stays out of the test environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/**/*.test.{js,jsx}",
        "src/test/**",
        "src/main.jsx",
        "src/index.jsx",
        "src/**/*.module.scss",
      ],
      reporter: ["text", "html"],
    },
  },
});
