import { describe, it, expect } from "vitest";
import { weeklyDateAxis } from "./DateAxisTick";

describe("weeklyDateAxis", () => {
  it("returns an empty axis for no data", () => {
    const axis = weeklyDateAxis([]);
    expect(axis.data).toEqual([]);
    expect(axis.ticks).toEqual([]);
  });

  it("generates fixed weekly ticks from the start of the range, independent of data", () => {
    // Only a workout on the 23rd, but the visible range runs 9 Jul -> 30 Jul.
    // Ticks should land every 7 days from the 9th (16, 23, 30), not just
    // on the day that has data.
    const data = [
      { date: "2026-07-09", value: 1 },
      { date: "2026-07-23", value: 2 },
      { date: "2026-07-30", value: 3 },
    ];
    const axis = weeklyDateAxis(data);
    const tickDates = axis.ticks.map((ms) => new Date(ms).toISOString().slice(0, 10));
    expect(tickDates).toEqual(["2026-07-16", "2026-07-23", "2026-07-30"]);
  });

  it("does not include the start date itself as a tick", () => {
    const data = [
      { date: "2026-07-09", value: 1 },
      { date: "2026-07-30", value: 3 },
    ];
    const axis = weeklyDateAxis(data);
    const tickDates = axis.ticks.map((ms) => new Date(ms).toISOString().slice(0, 10));
    expect(tickDates).not.toContain("2026-07-09");
  });

  it("falls back to start+end ticks when the range is shorter than a week", () => {
    const data = [
      { date: "2026-07-09", value: 1 },
      { date: "2026-07-11", value: 2 },
    ];
    const axis = weeklyDateAxis(data);
    expect(axis.ticks).toHaveLength(2);
    expect(new Date(axis.ticks[0]).toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(new Date(axis.ticks[1]).toISOString().slice(0, 10)).toBe("2026-07-11");
  });

  it("falls back to a single tick when there is only one data point", () => {
    const data = [{ date: "2026-07-09", value: 1 }];
    const axis = weeklyDateAxis(data);
    expect(axis.ticks).toHaveLength(1);
  });

  it("adds a numeric timestamp field without removing the original date field", () => {
    const data = [{ date: "2026-07-09", value: 1 }];
    const axis = weeklyDateAxis(data);
    expect(axis.data[0]).toMatchObject({ date: "2026-07-09", value: 1 });
    expect(axis.data[0][axis.xKey]).toBe(new Date("2026-07-09").getTime());
  });

  it("pads the domain beyond the data range", () => {
    const data = [
      { date: "2026-07-09", value: 1 },
      { date: "2026-07-30", value: 3 },
    ];
    const axis = weeklyDateAxis(data);
    const minMs = new Date("2026-07-09").getTime();
    const maxMs = new Date("2026-07-30").getTime();
    expect(axis.domain[0]).toBeLessThan(minMs);
    expect(axis.domain[1]).toBeGreaterThan(maxMs);
  });

  it("supports a custom date key", () => {
    const data = [
      { week_start: "2026-07-09", value: 1 },
      { week_start: "2026-07-30", value: 3 },
    ];
    const axis = weeklyDateAxis(data, "week_start");
    const tickDates = axis.ticks.map((ms) => new Date(ms).toISOString().slice(0, 10));
    expect(tickDates).toEqual(["2026-07-16", "2026-07-23", "2026-07-30"]);
  });
});
