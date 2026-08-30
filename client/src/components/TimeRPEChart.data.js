// One row per individual set — duration positions the dot, date places it
// on the x-axis. Sets without a duration logged have nothing to plot.
export function buildChartData(history) {
  return history
    .filter((s) => s.duration_min)
    .map((s) => ({ date: s.date, duration: s.duration_min, rpe: s.rpe ?? null }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
