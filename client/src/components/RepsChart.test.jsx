import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepsChart, { buildChartData } from "./RepsChart";

describe("RepsChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<RepsChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the heading when given data", () => {
    const history = [{ session_id: 1, date: "2026-01-01", reps: 5 }];
    render(<RepsChart history={history} />);
    expect(screen.getByText("Reps Progression")).toBeInTheDocument();
  });
});

describe("buildChartData", () => {
  it("sums reps across multiple sessions on the same date into one bar", () => {
    // Two separate sessions (e.g. AM/PM), same day — should merge into a
    // single bar with combined totals, not two separate bars.
    const history = [
      { session_id: 1, date: "2026-01-01", reps: 5 },
      { session_id: 2, date: "2026-01-01", reps: 8 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ date: "2026-01-01", totalReps: 13, sets: 2 });
  });
});
