import { describe, it, expect, vi, beforeEach } from "vitest";
import * as sessions from "./sessions";
import * as sets from "./sets";
import * as body from "./body";
import * as goals from "./goals";

// Helper to stub global.fetch with a single response.
function mockFetch({ ok = true, json = {} } = {}) {
  const fn = vi.fn().mockResolvedValue({ ok, json: async () => json });
  global.fetch = fn;
  return fn;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api modules — request shape", () => {
  it("getSessions GETs /api/sessions and returns parsed json", async () => {
    const fetchMock = mockFetch({ json: [{ id: 1 }] });
    const result = await sessions.getSessions();
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions");
    expect(result).toEqual([{ id: 1 }]);
  });

  it("createSession POSTs JSON with the right headers and body", async () => {
    const fetchMock = mockFetch({ json: { id: 7 } });
    await sessions.createSession({ date: "2026-01-01" });
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-01-01" }),
    });
  });

  it("createSet POSTs to /api/sets", async () => {
    const fetchMock = mockFetch({ json: { id: 1 } });
    await sets.createSet({ session_id: 1, exercise_id: 2, set_number: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sets",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deleteEntry DELETEs /api/body/:id", async () => {
    const fetchMock = mockFetch({ json: { ok: true } });
    await body.deleteEntry(42);
    expect(fetchMock).toHaveBeenCalledWith("/api/body/42", { method: "DELETE" });
  });

  it("checkGoals POSTs the exercise_id", async () => {
    const fetchMock = mockFetch({ json: { completed: [] } });
    await goals.checkGoals(9);
    expect(fetchMock).toHaveBeenCalledWith("/api/goals/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: 9 }),
    });
  });
});

describe("api modules — error handling", () => {
  it("throws when the response is not ok", async () => {
    mockFetch({ ok: false });
    await expect(sessions.getSessions()).rejects.toThrow("Failed to fetch sessions");
  });

  it("createGoal throws on a failed request", async () => {
    mockFetch({ ok: false });
    await expect(goals.createGoal({})).rejects.toThrow("Failed to create goal");
  });
});
