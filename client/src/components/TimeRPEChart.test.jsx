import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TimeRPEChart from "./TimeRPEChart";
import { buildChartData } from "./TimeRPEChart.data";

describe("TimeRPEChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<TimeRPEChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no set has a duration logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", reps: 1, duration_min: null, rpe: null },
    ];
    const { container } = render(<TimeRPEChart history={history} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a dot for a set with no rpe logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", reps: 1, duration_min: 1.5, rpe: null },
    ];
    const { container } = render(<TimeRPEChart history={history} />);
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText("Hold Time per Set")).toBeInTheDocument();
  });

  it("shows the RPE legend", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", reps: 1, duration_min: 1, rpe: 8 },
    ];
    render(<TimeRPEChart history={history} />);
    expect(screen.getByText("No RPE logged")).toBeInTheDocument();
  });
});

describe("buildChartData", () => {
  it("emits one row per set, not one per day", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", duration_min: 1, rpe: 6 },
      { session_id: 1, date: "2026-01-01", duration_min: 1.5, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      { date: "2026-01-01", duration: 1, rpe: 6 },
      { date: "2026-01-01", duration: 1.5, rpe: 9 },
    ]);
  });

  it("defaults rpe to null when not logged", () => {
    const history = [{ session_id: 1, date: "2026-01-01", duration_min: 1, rpe: null }];
    const data = buildChartData(history);
    expect(data[0]).toMatchObject({ duration: 1, rpe: null });
  });

  it("drops sets with no duration logged", () => {
    const history = [{ session_id: 1, date: "2026-01-01", duration_min: null, rpe: 8 }];
    expect(buildChartData(history)).toHaveLength(0);
  });

  it("sorts by date", () => {
    const history = [
      { session_id: 1, date: "2026-01-03", duration_min: 1, rpe: null },
      { session_id: 1, date: "2026-01-01", duration_min: 1.5, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-03"]);
  });
});
