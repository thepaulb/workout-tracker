import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PRBadge from "./PRBadge";
import styles from "./PRBadge.module.scss";

describe("PRBadge", () => {
  it("defaults to the weight variant", () => {
    render(<PRBadge />);
    const badge = screen.getByText("PR");
    expect(badge.className).toContain(styles.weight);
  });

  it("uses the reps variant when type='reps'", () => {
    render(<PRBadge type="reps" />);
    const badge = screen.getByText("PR");
    expect(badge.className).toContain(styles.reps);
  });
});
