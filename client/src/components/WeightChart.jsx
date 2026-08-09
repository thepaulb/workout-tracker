import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { calculateE1RM } from "../lib/exerciseMetrics";
import { weeklyDateAxis } from "../lib/DateAxisTick";
import { niceStepDomain } from "../lib/niceAxis";
import styles from "./WeightChart.module.scss";

export default function WeightChart({ history }) {
  const data = buildChartData(history);
  if (!data.length) return null;

  const weights = data.map((d) => d.weight);
  const maxWeight = Math.max(...weights);

  const values = data.flatMap((d) =>
    d.oneRepMax != null ? [d.weight, d.oneRepMax] : [d.weight]
  );
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const { domain: weightDomain, ticks: weightTicks } = niceStepDomain(
    minValue,
    maxValue,
    5
  );
  const {
    data: chartData,
    xKey: dateKey,
    domain: dateDomain,
    ticks: dateTicks,
    tick: DateTick,
  } = weeklyDateAxis(data);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Weight Progression (KG)</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
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
            domain={weightDomain}
            ticks={weightTicks}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            align="left"
            wrapperStyle={{ fontSize: "0.75rem", color: "#6b6e74" }}
          />
          <ReferenceLine
            y={maxWeight}
            stroke="#3ecf8e"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <Line
            type="monotone"
            dataKey="weight"
            name="Weight"
            stroke="#4a9eff"
            strokeWidth={2}
            dot={{ fill: "#4a9eff", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#4a9eff", r: 5, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="oneRepMax"
            name="e1RM"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#a78bfa", r: 5, strokeWidth: 0 }}
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
      <div className={styles.tooltipWeight}>{d.weight}kg</div>
      {d.oneRepMax != null && (
        <div className={styles.tooltipOneRepMax}>Est. 1RM {d.oneRepMax}kg</div>
      )}
      <div className={styles.tooltipSets}>
        {d.sets} sets · best {d.bestReps} reps
      </div>
    </div>
  );
}

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

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
