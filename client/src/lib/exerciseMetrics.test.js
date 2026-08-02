import { describe, it, expect } from "vitest";
import { calculateE1RM, formatSet } from "./exerciseMetrics";

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
