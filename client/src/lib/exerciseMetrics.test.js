import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateE1RM,
  formatSet,
  formatDaysAgo,
  bestE1RMFromSets,
  bestRepsFromSets,
  bestSpeedFromSets,
  bestDurationFromSets,
  getSetPRFlags,
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

  it("formats a timed (isometric hold) set as time, not weight/reps", () => {
    expect(
      formatSet({ progression_type: "time", reps: 1, duration_min: 1.5, rpe: 7 }),
    ).toBe("1:30 · RPE 7");
  });

  it("omits the single rep from a timed set but keeps it when >1", () => {
    expect(formatSet({ progression_type: "time", reps: 1, duration_min: 1 })).toBe(
      "1:00",
    );
    expect(formatSet({ progression_type: "time", reps: 3, duration_min: 0.5 })).toBe(
      "3 reps · 0:30",
    );
  });

  it("does not use cardio formatting for a non-cardio set just because duration_min is set", () => {
    // Regression: formatSet used to infer cardio formatting from field
    // presence (distance_m/duration_min) rather than the exercise's actual
    // progression_type, so a timed set with a stray weight_kg got
    // mis-rendered as distance/pace and its reps/weight silently dropped.
    expect(
      formatSet({ progression_type: "reps", reps: 1, weight_kg: 0, duration_min: 1.5 }),
    ).not.toContain("km/h");
  });

  it("uses cardio formatting only when progression_type is 'pace'", () => {
    expect(
      formatSet({ progression_type: "pace", distance_m: 5000, duration_min: 24.5 }),
    ).toBe("5km · 24:30");
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

describe("getSetPRFlags", () => {
  // The is_*_pr fields are computed server-side (first time a set exceeds
  // every prior set for that metric — see routes/exercises.js and
  // routes/sessions.js); this just verifies they're read through correctly.
  it("reads PR flags straight off the set", () => {
    const flags = getSetPRFlags({ is_duration_pr: 1, is_reps_pr: 0 });
    expect(flags.isDurationPR).toBe(true);
    expect(flags.isRepsPR).toBe(false);
    expect(flags.isPR).toBe(true);
  });

  it("treats a falsy/absent flag as not a PR", () => {
    const flags = getSetPRFlags({ is_weight_pr: 0 });
    expect(flags.isWeightPR).toBe(false);
    expect(flags.isPR).toBe(false);
  });
});

describe("bestDurationFromSets", () => {
  it("returns null when nothing has duration_min", () => {
    expect(bestDurationFromSets([{ duration_min: null }])).toBeNull();
  });

  it("returns the max duration", () => {
    expect(
      bestDurationFromSets([{ duration_min: 1 }, { duration_min: 1.5 }]),
    ).toBe(1.5);
  });
});
