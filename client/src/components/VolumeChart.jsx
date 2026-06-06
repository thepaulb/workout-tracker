import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./VolumeChart.module.scss";

export default function VolumeChart({ data }) {
  if (!data.length) return null;

  const formatted = data.map((d) => ({
    ...d,
    volume_tonnes: Math.round(d.volume_kg / 100) / 10,
  }));

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Volume per Week</h2>
        <span className={styles.unit}>tonnes lifted</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={formatted}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="week_start"
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatTick}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `${v}t`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="volume_tonnes"
            fill="#f5a623"
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
      <div className={styles.tooltipDate}>{formatFullDate(d.week_start)}</div>
      <div className={styles.tooltipVolume}>{d.volume_tonnes}t</div>
      <div className={styles.tooltipMeta}>
        {d.sessions} sessions · {d.total_sets} sets
      </div>
    </div>
  );
}

function formatTick(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
