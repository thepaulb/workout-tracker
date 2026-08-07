import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { makeDateTick } from "../lib/DateAxisTick";
import styles from "./RepsChart.module.scss";

export default function RepsChart({ history }) {
  const data = buildChartData(history);
  if (!data.length) return null;

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Reps Progression</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={makeDateTick(data)}
            axisLine={false}
            tickLine={false}
            height={34}
          />
          <YAxis
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="totalReps"
            fill="#3ecf8e"
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
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
      <div className={styles.tooltipReps}>{d.totalReps} reps</div>
      <div className={styles.tooltipSets}>
        {d.sets} sets · best {d.bestReps}/set
      </div>
    </div>
  );
}

// Grouped by date, not session_id — a day can have multiple sessions
// (e.g. AM/PM), and they should still collapse into one chart point.
export function buildChartData(history) {
  const byDate = {};

  for (const set of history) {
    if (!set.reps) continue;
    if (!byDate[set.date]) {
      byDate[set.date] = {
        date: set.date,
        reps: [],
      };
    }
    byDate[set.date].reps.push(set.reps);
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      totalReps: s.reps.reduce((a, b) => a + b, 0),
      sets: s.reps.length,
      bestReps: Math.max(...s.reps),
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
