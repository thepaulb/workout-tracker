import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./RPEChart.module.scss";

// RPE logged on the session's top set (highest weight), plotted over time.
// Deliberately separate from the e1RM chart: different axis, different
// meaning — this tracks perceived effort, not estimated strength.
export default function RPEChart({ history }) {
  const data = buildChartData(history);
  if (!data.length) return null;

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>RPE at Top Set</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatTick}
          />
          <YAxis
            domain={[6, 10]}
            ticks={[6, 7, 8, 9, 10]}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="rpe"
            name="RPE"
            stroke="#f97058"
            strokeWidth={2}
            dot={{ fill: "#f97058", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#f97058", r: 5, strokeWidth: 0 }}
            connectNulls
          />
        </LineChart>
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
      <div className={styles.tooltipSets}>top set {d.topWeight}kg</div>
    </div>
  );
}

// For each session, find the set with the highest weight (the "top set")
// and take its rpe. Sessions where the top set has no rpe logged are
// skipped — nothing to plot.
function buildChartData(history) {
  const bySession = {};

  for (const set of history) {
    if (!set.weight_kg) continue;
    const current = bySession[set.session_id];
    if (!current || set.weight_kg > current.topWeight) {
      bySession[set.session_id] = {
        date: set.date,
        topWeight: set.weight_kg,
        rpe: set.rpe ?? null,
      };
    }
  }

  return Object.values(bySession)
    .filter((s) => s.rpe != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatTick(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
