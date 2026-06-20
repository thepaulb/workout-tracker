import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PRBadge from "../components/PRBadge";

describe("client test harness", () => {
  it("renders a component into jsdom", () => {
    render(<PRBadge type="reps" />);
    expect(screen.getByText("PR")).toBeInTheDocument();
  });
});
