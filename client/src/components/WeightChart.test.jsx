import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WeightChart, { buildChartData } from "./WeightChart";

describe("WeightChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<WeightChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the heading when given data", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    render(<WeightChart history={history} />);
    expect(screen.getByText("Weight Progression")).toBeInTheDocument();
  });
});

describe("buildChartData", () => {
  it("collapses multiple sessions on the same date into one point", () => {
    // Two separate sessions (e.g. AM/PM), same day — should merge into a
    // single chart point rather than producing two entries for one date.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 5, rpe: null },
      { session_id: 2, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ date: "2026-01-01", weight: 100, sets: 2 });
  });

  it("keeps separate dates as separate points", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 5, rpe: null },
      { session_id: 2, date: "2026-01-02", weight_kg: 82, reps: 5, rpe: null },
    ];
    expect(buildChartData(history)).toHaveLength(2);
  });
});
