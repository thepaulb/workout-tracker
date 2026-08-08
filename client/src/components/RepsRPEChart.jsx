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

// RPE (line, left axis) and reps (bar, right axis) for the same top set
// (the day's heaviest set) — a strict 1:1 pairing, not "RPE of the top
// set" next to "total reps for the whole day". A day only gets a point at
// all if that top set has an RPE logged, so this is sparser than a plain
// reps chart: no RPE that day means nothing to plot, not a zero-height bar.
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
            connectNulls
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
      <div className={styles.tooltipRpe}>RPE {d.rpe}</div>
      <div className={styles.tooltipReps}>{d.topSetReps} reps</div>
      <div className={styles.tooltipSets}>top set {d.topWeight}kg</div>
    </div>
  );
}

// For each date, find the set with the highest weight (the "top set")
// across all of that day's sessions — a day can have multiple sessions
// (e.g. AM/PM), and they should still collapse into one chart point.
// Dates where the top set has no rpe logged are skipped entirely — reps
// and RPE describe the same set, so there's nothing to plot without both.
export function buildChartData(history) {
  const byDate = {};

  for (const set of history) {
    if (!set.weight_kg) continue;
    const current = byDate[set.date];
    if (!current || set.weight_kg > current.topWeight) {
      byDate[set.date] = {
        date: set.date,
        topWeight: set.weight_kg,
        topSetReps: set.reps ?? null,
        rpe: set.rpe ?? null,
      };
    }
  }

  return Object.values(byDate)
    .filter((s) => s.rpe != null)
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
