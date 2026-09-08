import { calculateE1RM } from "../lib/exerciseMetrics";

const DAY_MS = 24 * 60 * 60 * 1000;

// Gaps at least this long (e.g. injury, holiday) break the weight line
// instead of joining straight across the missing weeks.
export const DEFAULT_GAP_BREAK_DAYS = 14;

// Grouped by date, not session_id — a day can have multiple sessions
// (e.g. AM/PM), and they should still collapse into one chart point.
export function buildChartData(history, gapBreakDays = DEFAULT_GAP_BREAK_DAYS) {
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

  const points = Object.values(byDate)
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

  // Points are tagged with a __segment index that increments at each gap
  // >= gapBreakDays. Both series are rendered as one <Line> per segment
  // (see WeightChart.jsx) so both break together at the same gaps, while
  // still connecting within a segment across days with no e1RM recorded.
  let segment = 0;
  return points.map((p, i) => {
    if (i > 0 && gapBreakDays) {
      const prevMs = new Date(points[i - 1].date).getTime();
      const curMs = new Date(p.date).getTime();
      if (curMs - prevMs >= gapBreakDays * DAY_MS) segment++;
    }
    return {
      ...p,
      __segment: segment,
      [`weight_${segment}`]: p.weight,
      [`oneRepMax_${segment}`]: p.oneRepMax,
    };
  });
}
