import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateE1RM,
  formatSet,
  formatDaysAgo,
  bestE1RMFromSets,
  bestRepsFromSets,
  bestSpeedFromSets,
} from "./exerciseMetrics";

describe("calculateE1RM", () => {
  it("falls back to plain Epley when rpe is null", () => {
    // 100kg x 5 reps -> 100 * (1 + 5/30)
    expect(calculateE1RM(100, 5, null)).toBeCloseTo(116.667, 2);
  });

  it("falls back to plain Epley when rpe is below 7", () => {
    expect(calculateE1RM(100, 5, 6.5)).toBeCloseTo(116.667, 2);
  });

  it("uses RPE-adjusted Epley when rpe >= 7", () => {
    // RPE 8 -> RIR 2 -> 100 * (1 + (5+2)/30)
    expect(calculateE1RM(100, 5, 8)).toBeCloseTo(123.333, 2);
  });

  it("treats rpe 10 (RIR 0) as the reps-only case", () => {
    expect(calculateE1RM(100, 5, 10)).toBeCloseTo(calculateE1RM(100, 5, null), 5);
  });

  it("returns null when weight or reps are missing", () => {
    expect(calculateE1RM(null, 5, 8)).toBeNull();
    expect(calculateE1RM(100, null, 8)).toBeNull();
    expect(calculateE1RM(100, 0, 8)).toBeNull();
  });
});

describe("formatSet", () => {
  it("appends RPE when logged", () => {
    expect(formatSet({ reps: 5, weight_kg: 80, rpe: 8.5 })).toBe(
      "5 reps · 80kg · RPE 8.5",
    );
  });

  it("omits RPE when not logged", () => {
    expect(formatSet({ reps: 5, weight_kg: 80, rpe: null })).toBe(
      "5 reps · 80kg",
    );
  });

  it("omits RPE when the field is absent entirely", () => {
    expect(formatSet({ reps: 5, weight_kg: 80 })).toBe("5 reps · 80kg");
  });
});

describe("formatDaysAgo", () => {
  afterEach(() => vi.useRealTimers());

  it("returns a dash for a missing date", () => {
    expect(formatDaysAgo(null)).toBe("—");
  });

  it("returns Today/Yesterday/Nd ago relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00Z"));
    expect(formatDaysAgo("2026-08-10")).toBe("Today");
    expect(formatDaysAgo("2026-08-09")).toBe("Yesterday");
    expect(formatDaysAgo("2026-08-03")).toBe("7d ago");
  });
});

describe("bestE1RMFromSets", () => {
  it("returns null when no set has both weight_kg and reps", () => {
    expect(bestE1RMFromSets([{ weight_kg: null, reps: 12, rpe: 8 }])).toBeNull();
  });

  it("picks the best e1RM among qualifying sets", () => {
    const sets = [
      { weight_kg: 80, reps: 5, rpe: null },
      { weight_kg: 100, reps: 3, rpe: 9 },
    ];
    // 80x5 -> 93.33, 100x3 (rpe9, rir1) -> 100*(1+4/30)=113.33
    expect(bestE1RMFromSets(sets)).toBeCloseTo(113.3, 1);
  });
});

describe("bestRepsFromSets", () => {
  it("returns null when nothing has reps", () => {
    expect(bestRepsFromSets([{ reps: null }])).toBeNull();
  });

  it("returns the max reps", () => {
    expect(bestRepsFromSets([{ reps: 8 }, { reps: 12 }, { reps: 5 }])).toBe(12);
  });
});

describe("bestSpeedFromSets", () => {
  it("returns null when nothing has speed_kmh", () => {
    expect(bestSpeedFromSets([{ speed_kmh: null }])).toBeNull();
  });

  it("returns the max speed", () => {
    expect(bestSpeedFromSets([{ speed_kmh: 10 }, { speed_kmh: 12.5 }])).toBe(12.5);
  });
});
