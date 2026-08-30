// One row per individual set — reps position the dot, date places it on
// the x-axis. Sets without reps logged have nothing to plot.
export function buildChartData(history) {
  return history
    .filter((s) => s.reps)
    .map((s) => ({ date: s.date, reps: s.reps, rpe: s.rpe ?? null }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
