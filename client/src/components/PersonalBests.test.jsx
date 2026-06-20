import { describe, it, expect } from "vitest";
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
  },
  {
    id: 2,
    name: "Pull Up",
    best_weight: null, // bodyweight exercise
    best_reps: 15,
    session_count: 8,
    last_session: "2026-03-10",
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
  it("splits weighted and bodyweight exercises into separate groups", () => {
    renderBests(bests);
    expect(screen.getByText("Weighted")).toBeInTheDocument();
    expect(screen.getByText("Bodyweight")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Pull Up")).toBeInTheDocument();
    expect(screen.getByText("100kg")).toBeInTheDocument();
  });

  it("formats the last-session date as en-GB", () => {
    renderBests(bests);
    expect(screen.getByText("15 Mar 2026")).toBeInTheDocument();
  });

  it("omits the Weighted group when there are no weighted lifts", () => {
    renderBests([bests[1]]);
    expect(screen.queryByText("Weighted")).not.toBeInTheDocument();
    expect(screen.getByText("Bodyweight")).toBeInTheDocument();
  });
});
