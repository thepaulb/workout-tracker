import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RPEInput from "./RPEInput";

describe("RPEInput", () => {
  it("shows a dash and a disabled minus button when unset", () => {
    render(<RPEInput value={null} onChange={() => {}} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease RPE")).toBeDisabled();
  });

  it("increments from unset straight to 6", async () => {
    const onChange = vi.fn();
    render(<RPEInput value={null} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Increase RPE"));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("increments by 0.5 and caps at 10", async () => {
    const onChange = vi.fn();
    render(<RPEInput value={9.5} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Increase RPE"));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("disables increment at the max", () => {
    render(<RPEInput value={10} onChange={() => {}} />);
    expect(screen.getByLabelText("Increase RPE")).toBeDisabled();
  });

  it("decrementing below the min clears back to null", async () => {
    const onChange = vi.fn();
    render(<RPEInput value={6} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Decrease RPE"));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
