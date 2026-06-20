import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VolumeChart from "./VolumeChart";

// Charts are smoke-tested only: render without crashing and show the title.
// Pixel-level recharts internals are not worth asserting.
describe("VolumeChart", () => {
  it("renders nothing for empty data", () => {
    const { container } = render(<VolumeChart data={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the heading when given data", () => {
    const data = [
      { week_start: "2026-01-05", volume_kg: 1000, sessions: 2, total_sets: 8 },
    ];
    render(<VolumeChart data={data} />);
    expect(screen.getByText("Volume per Week")).toBeInTheDocument();
  });
});
