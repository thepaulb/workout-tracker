import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LogSession from "./LogSession";
import { getSession } from "../api/sessions";
import { updateSet, createSet } from "../api/sets";

vi.mock("../api/sessions", () => ({ getSession: vi.fn() }));
vi.mock("../api/exercises", () => ({ getExercises: vi.fn(async () => []) }));
vi.mock("../api/progress", () => ({ getPRs: vi.fn(async () => ({})) }));
vi.mock("../api/goals", () => ({ checkGoals: vi.fn(async () => ({})) }));
vi.mock("../api/sets", () => ({
  createSet: vi.fn(async () => ({ id: 99 })),
  updateSet: vi.fn(async () => ({ ok: true })),
  deleteSet: vi.fn(async () => ({ ok: true })),
  getLastSet: vi.fn(async () => null),
}));

const baseSet = {
  session_id: 1,
  set_number: 1,
  weight_note: null,
  distance_m: null,
  speed_kmh: null,
  is_ladder: 0,
  ladder_step: null,
};

const weightedSet = {
  ...baseSet,
  id: 10,
  exercise_id: 5,
  exercise_name: "Bench Press",
  category: "push",
  progression_type: "weight",
  reps: 8,
  weight_kg: 60,
  duration_min: null,
  rest_min: 2,
  notes: "felt heavy",
  rpe: 8,
};

const cardioSet = {
  ...baseSet,
  id: 11,
  exercise_id: 6,
  exercise_name: "Row",
  category: "cardio",
  progression_type: "pace",
  reps: null,
  weight_kg: null,
  distance_m: 5000,
  duration_min: 24.5,
  speed_kmh: 12.24,
  rest_min: null,
  notes: null,
  rpe: null,
};

function renderLog(sets) {
  getSession.mockResolvedValue({ id: 1, date: "2026-03-15", sets });
  return render(
    <MemoryRouter initialEntries={["/sessions/1/log"]}>
      <Routes>
        <Route path="/sessions/:id/log" element={<LogSession />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LogSession — editing a set", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pre-fills the form from the set and PATCHes the changed values", async () => {
    const user = userEvent.setup();
    renderLog([weightedSet]);

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    expect(screen.getByText("Edit set · Bench Press")).toBeInTheDocument();
    const [reps, weight] = screen.getAllByRole("spinbutton");
    expect(reps).toHaveValue(8);
    expect(weight).toHaveValue(60);
    expect(screen.getByDisplayValue("felt heavy")).toBeInTheDocument();

    await user.clear(weight);
    await user.type(weight, "62.5");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateSet).toHaveBeenCalledWith(10, {
        reps: 8,
        weight_kg: 62.5,
        rest_min: 2,
        notes: "felt heavy",
        rpe: 8,
      }),
    );
    expect(createSet).not.toHaveBeenCalled();
    // Returns to the session view after saving.
    expect(await screen.findByText("+ Add Exercise")).toBeInTheDocument();
  });

  it("sends null for a cleared field so it can be removed", async () => {
    const user = userEvent.setup();
    renderLog([weightedSet]);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.clear(screen.getAllByRole("spinbutton")[1]); // weight
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateSet).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ weight_kg: null }),
      ),
    );
  });

  it("pre-fills cardio distance/time and recomputes speed on save", async () => {
    const user = userEvent.setup();
    renderLog([cardioSet]);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    const time = screen.getByPlaceholderText("mm:ss");
    expect(time).toHaveValue("24:30");

    await user.clear(time);
    await user.type(time, "25:00");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateSet).toHaveBeenCalledWith(11, {
        distance_m: 5000,
        duration_min: 25,
        speed_kmh: 12,
        notes: null,
      }),
    );
  });

  it("Cancel leaves the set untouched", async () => {
    const user = userEvent.setup();
    renderLog([weightedSet]);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateSet).not.toHaveBeenCalled();
    expect(await screen.findByText("+ Add Exercise")).toBeInTheDocument();
  });
});
