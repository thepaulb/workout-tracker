import { calculateE1RM } from "../lib/exerciseMetrics";

// Grouped by date, not session_id — a day can have multiple sessions
// (e.g. AM/PM), and they should still collapse into one chart point.
export function buildChartData(history) {
  const byDate = {};

  for (const set of history) {
    if (!set.weight_kg) continue;
    if (!byDate[set.date]) {
      byDate[set.date] = {
        date: set.date,
        weights: [],
        reps: [],
        oneRepMaxes: [],
      };
    }
    byDate[set.date].weights.push(set.weight_kg);
    if (set.reps) {
      byDate[set.date].reps.push(set.reps);
      const e1rm = calculateE1RM(set.weight_kg, set.reps, set.rpe);
      if (e1rm != null) byDate[set.date].oneRepMaxes.push(e1rm);
    }
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      weight: Math.max(...s.weights),
      sets: s.weights.length,
      bestReps: s.reps.length ? Math.max(...s.reps) : "—",
      oneRepMax: s.oneRepMaxes.length
        ? Math.round(Math.max(...s.oneRepMaxes) * 10) / 10
        : null,
    }));
}
