import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepsRPEChart, { buildChartData } from "./RepsRPEChart";

describe("RepsRPEChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<RepsRPEChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no set has reps logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: null, rpe: null },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a dot for a set with no rpe logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText("Reps per Set")).toBeInTheDocument();
  });

  it("renders for a bodyweight-only set (no weight_kg at all)", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 12, rpe: 7 },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("shows the RPE legend", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: 8 },
    ];
    render(<RepsRPEChart history={history} />);
    expect(screen.getByText("No RPE logged")).toBeInTheDocument();
  });
});

describe("buildChartData", () => {
  it("emits one row per set, not one per day", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 6 },
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      { date: "2026-01-01", reps: 8, rpe: 6 },
      { date: "2026-01-01", reps: 3, rpe: 9 },
    ]);
  });

  it("keeps sets from multiple sessions on the same date as separate rows", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 7 },
      { session_id: 2, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(2);
  });

  it("defaults rpe to null when not logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data[0]).toMatchObject({ reps: 5, rpe: null });
  });

  it("drops sets with no reps logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: null, rpe: 8 },
    ];
    expect(buildChartData(history)).toHaveLength(0);
  });

  it("sorts by date", () => {
    const history = [
      { session_id: 1, date: "2026-01-03", reps: 5, rpe: null },
      { session_id: 1, date: "2026-01-01", reps: 8, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-03"]);
  });
});
