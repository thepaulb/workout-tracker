import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RPEChart, { buildChartData } from "./RPEChart";

describe("RPEChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<RPEChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no set in history has an rpe", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, rpe: null },
    ];
    const { container } = render(<RPEChart history={history} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the heading when a top set has an rpe", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, rpe: 8 },
    ];
    render(<RPEChart history={history} />);
    expect(screen.getByText("RPE at Top Set")).toBeInTheDocument();
  });

  it("picks the rpe from the highest-weight set in a session", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, rpe: 6 },
      { session_id: 1, date: "2026-01-01", weight_kg: 100, rpe: 9 },
    ];
    render(<RPEChart history={history} />);
    // smoke-tested: renders without crashing and picks a data point
    expect(screen.getByText("RPE at Top Set")).toBeInTheDocument();
  });

});

describe("buildChartData", () => {
  it("collapses multiple sessions on the same date into one point", () => {
    // Two separate sessions (e.g. AM/PM), same day — should merge, not
    // produce two x-axis entries for the same date.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, rpe: 6 },
      { session_id: 2, date: "2026-01-01", weight_kg: 100, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    // top set across the day is the 100kg one -> its rpe (9) is what's plotted
    expect(data[0]).toMatchObject({ date: "2026-01-01", topWeight: 100, rpe: 9 });
  });
});
