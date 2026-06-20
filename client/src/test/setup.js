// Client test setup: jest-dom matchers + per-test cleanup, and a fresh
// fetch mock for each test (most components talk to the API over fetch).
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
