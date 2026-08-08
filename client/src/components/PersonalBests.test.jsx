import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PersonalBests from "./PersonalBests";

const bests = [
  {
    id: 1,
    name: "Bench Press",
    best_weight: 100,
    best_reps: 5,
    session_count: 12,
    last_session: "2026-03-15",
    recent_sets: [{ weight_kg: 100, reps: 5, rpe: null }],
  },
  {
    id: 2,
    name: "Pull Up",
    best_weight: null, // bodyweight exercise
    best_reps: 15,
    session_count: 8,
    last_session: "2026-03-10",
    recent_sets: [{ weight_kg: null, reps: 12, rpe: null }],
  },
];

function renderBests(data) {
  return render(
    <MemoryRouter>
      <PersonalBests bests={data} />
    </MemoryRouter>,
  );
}

describe("PersonalBests", () => {
  afterEach(() => vi.useRealTimers());

  it("splits weighted and bodyweight exercises into separate groups", () => {
    renderBests(bests);
    expect(screen.getByText("Weighted")).toBeInTheDocument();
    expect(screen.getByText("Bodyweight")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Pull Up")).toBeInTheDocument();
    expect(screen.getByText("100kg")).toBeInTheDocument();
  });

  it("formats the last-session date relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
    renderBests(bests);
    expect(screen.getByText("Yesterday")).toBeInTheDocument(); // 15 Mar
    expect(screen.getByText("6d ago")).toBeInTheDocument(); // 10 Mar
  });

  it("shows current e1RM computed from recent_sets", () => {
    renderBests(bests);
    // 100kg x 5 reps, no rpe -> plain Epley: 100 * (1 + 5/30) = 116.7
    expect(screen.getByText("116.7kg")).toBeInTheDocument();
    expect(screen.getByText("current e1RM")).toBeInTheDocument();
  });

  it("falls back to current top set reps for a bodyweight-only recent day", () => {
    const mixed = [
      {
        id: 3,
        name: "Weighted Pull-up",
        best_weight: 20,
        best_reps: 8,
        last_session: "2026-03-15",
        // most recent day had no weighted set at all
        recent_sets: [{ weight_kg: null, reps: 10, rpe: null }],
      },
    ];
    renderBests(mixed);
    expect(screen.getByText("current top set")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows current top set reps for bodyweight exercises", () => {
    renderBests(bests);
    expect(screen.getByText("current top set")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("omits the Weighted group when there are no weighted lifts", () => {
    renderBests([bests[1]]);
    expect(screen.queryByText("Weighted")).not.toBeInTheDocument();
    expect(screen.getByText("Bodyweight")).toBeInTheDocument();
  });
});
