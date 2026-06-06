import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import styles from "./WeightChart.module.scss";

export default function WeightChart({ history }) {
  const data = buildChartData(history);
  if (!data.length) return null;

  const weights = data.map((d) => d.weight);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 2.5;

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Weight Progression</h2>
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
            domain={[minWeight - padding, maxWeight + padding]}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}kg`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={maxWeight}
            stroke="#3ecf8e"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#4a9eff"
            strokeWidth={2}
            dot={{ fill: "#4a9eff", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#4a9eff", r: 5, strokeWidth: 0 }}
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
      <div className={styles.tooltipWeight}>{d.weight}kg</div>
      <div className={styles.tooltipSets}>
        {d.sets} sets · best {d.bestReps} reps
      </div>
    </div>
  );
}

function buildChartData(history) {
  const bySession = {};

  for (const set of history) {
    if (!set.weight_kg) continue;
    if (!bySession[set.session_id]) {
      bySession[set.session_id] = {
        date: set.date,
        weights: [],
        reps: [],
      };
    }
    bySession[set.session_id].weights.push(set.weight_kg);
    if (set.reps) bySession[set.session_id].reps.push(set.reps);
  }

  return Object.values(bySession)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      weight: Math.max(...s.weights),
      sets: s.weights.length,
      bestReps: s.reps.length ? Math.max(...s.reps) : "—",
    }));
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
