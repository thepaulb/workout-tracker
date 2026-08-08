import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { weeklyDateAxis } from "../lib/DateAxisTick";
import styles from "./RepsRPEChart.module.scss";

const BAR_WIDTH = 10;

// RPE (line, left axis) and reps (bar, right axis) for the same top set —
// a 1:1 pairing, not "RPE of the top set" next to "total reps for the
// whole day". The reps bar shows on every date with a set to plot, RPE
// logged or not, so this stays useful even when RPE isn't tracked; the
// RPE line only draws a point where it was — real gaps, not interpolated
// across days with no RPE.
export default function RepsRPEChart({ history }) {
  const data = buildChartData(history);
  if (!data.length) return null;

  const {
    data: chartData,
    xKey: dateKey,
    domain: dateDomain,
    ticks: dateTicks,
    tick: DateTick,
  } = weeklyDateAxis(data);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Reps & RPE at Top Set</h2>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey={dateKey}
            type="number"
            domain={dateDomain}
            ticks={dateTicks}
            tick={DateTick}
            axisLine={false}
            tickLine={false}
            interval={0}
            height={34}
          />
          <YAxis
            yAxisId="rpe"
            orientation="left"
            domain={[6, 10]}
            ticks={[6, 7, 8, 9, 10]}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <YAxis
            yAxisId="reps"
            orientation="right"
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#6b6e74" }} />
          <Bar
            yAxisId="reps"
            dataKey="topSetReps"
            name="Reps"
            fill="#3ecf8e"
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            barSize={BAR_WIDTH}
          />
          <Line
            yAxisId="rpe"
            type="monotone"
            dataKey="rpe"
            name="RPE"
            stroke="#f97058"
            strokeWidth={2}
            dot={{ fill: "#f97058", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#f97058", r: 5, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{formatFullDate(d.date)}</div>
      {d.rpe != null && (
        <div className={styles.tooltipRpe}>RPE {d.rpe}</div>
      )}
      <div className={styles.tooltipReps}>{d.topSetReps} reps</div>
      {d.topWeight != null && (
        <div className={styles.tooltipSets}>top set {d.topWeight}kg</div>
      )}
    </div>
  );
}

// For each date, find the "top set" across all of that day's sessions (a
// day can have multiple sessions, e.g. AM/PM, and they should still
// collapse into one chart point). If any set that day has weight_kg, the
// top set is the heaviest of those — matching the weight-based PRs
// elsewhere in the app. If none do (a bodyweight-only day, e.g. Pull-up
// with no added weight), the top set falls back to the highest-reps set
// instead, so RPE logged on a bodyweight set isn't invisible just because
// there's no weight to rank it by.
export function buildChartData(history) {
  const byDate = {};

  for (const set of history) {
    if (!set.reps && !set.weight_kg) continue;
    if (!byDate[set.date]) byDate[set.date] = [];
    byDate[set.date].push(set);
  }

  return Object.entries(byDate)
    .map(([date, sets]) => {
      const weighted = sets.filter((s) => s.weight_kg);
      const topSet = weighted.length
        ? weighted.reduce((best, s) =>
            s.weight_kg > best.weight_kg ? s : best,
          )
        : sets.reduce((best, s) =>
            (s.reps ?? 0) > (best.reps ?? 0) ? s : best,
          );

      return {
        date,
        topWeight: topSet.weight_kg ?? null,
        topSetReps: topSet.reps ?? null,
        rpe: topSet.rpe ?? null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
