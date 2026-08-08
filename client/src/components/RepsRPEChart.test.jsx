import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepsRPEChart, { buildChartData } from "./RepsRPEChart";

describe("RepsRPEChart", () => {
  it("renders nothing for empty history", () => {
    const { container } = render(<RepsRPEChart history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when a set has neither reps nor weight_kg", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: null, rpe: null },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the reps bar even when no top set has an rpe logged", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText("Reps & RPE at Top Set")).toBeInTheDocument();
  });

  it("renders for a bodyweight-only day (no weight_kg at all)", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 12, rpe: 7 },
    ];
    const { container } = render(<RepsRPEChart history={history} />);
    expect(container).not.toBeEmptyDOMElement();
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

  it("keeps a date with a weighted top set even when it has no rpe logged", () => {
    // Reps must stay visible on its own — most history won't have rpe.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 5, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ topWeight: 100, topSetReps: 5, rpe: null });
  });

  it("does not substitute a lighter set's rpe onto the top set", () => {
    // rpe belongs to the 80kg set, but the top set is 100kg with no rpe —
    // per the 1:1 pairing, the 80kg set's rpe is not carried over.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: 80, reps: 8, rpe: 7 },
      { session_id: 1, date: "2026-01-01", weight_kg: 100, reps: 3, rpe: null },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ topWeight: 100, topSetReps: 3, rpe: null });
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

  it("falls back to the highest-reps set when nothing that day is weighted", () => {
    // Pull-up done purely bodyweight: no set has weight_kg, so the top set
    // is picked by reps instead — otherwise a logged rpe would be invisible.
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 12, rpe: 7 },
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 11, rpe: 9 },
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 10, rpe: 10 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ topWeight: null, topSetReps: 12, rpe: 7 });
  });

  it("prefers a weighted set over a higher-rep bodyweight set on a mixed day", () => {
    const history = [
      { session_id: 1, date: "2026-01-01", weight_kg: null, reps: 20, rpe: 6 },
      { session_id: 1, date: "2026-01-01", weight_kg: 20, reps: 5, rpe: 9 },
    ];
    const data = buildChartData(history);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ topWeight: 20, topSetReps: 5, rpe: 9 });
  });
});
