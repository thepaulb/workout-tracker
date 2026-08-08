import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepsRPEChart, { buildChartData } from "./RepsRPEChart";

describe("RepsRPEChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<RepsRPEChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no top set has an rpe logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the heading when a top set has an rpe", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: 8 },
    ];
    render(<RepsRPEChart history={history} />);
    expect(screen.getByText("Reps & RPE at Top Set")).toBeInTheDocument();
  });
});

describe("buildChartData", () => {
  it("pairs rpe with the reps of that same top set", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 6 },
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    // top set is the 100kg one -> its own reps (3) and rpe (9) travel together
    expect(data[0]).toMatchObject({
      date: "2026-01-01",
      topWeight: 100,
      topSetReps: 3,
      rpe: 9,
    });
  });

  it("drops a date entirely when the top set has no rpe logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    expect(buildChartData(history)).toHaveLength(0);
  });

  it("drops a date when the top set has no rpe, even if a lighter set that day does", () => {
    // rpe belongs to the 80kg set, but the top set is 100kg with no rpe —
    // per the 1:1 pairing, the 80kg set's rpe is not substituted in.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 7 },
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: null },
    ];
    expect(buildChartData(history)).toHaveLength(0);
  });

  it("collapses multiple sessions on the same date into one point", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 7 },
      { session_id: 2, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ topWeight: 100, topSetReps: 3, rpe: 9 });
  });

  it("ignores sets with no weight_kg (bodyweight exercises have no top set to pair)", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 12, rpe: 8 },
    ];
    expect(buildChartData(history)).toHaveLength(0);
  });
});
