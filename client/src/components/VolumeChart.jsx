import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { weeklyDateAxis } from "../lib/DateAxisTick";
import { niceZeroDomain } from "../lib/niceAxis";
import styles from "./VolumeChart.module.scss";

const BAR_WIDTH = 14;

export default function VolumeChart({ data }) {
  if (!data.length) return null;

  const formatted = data.map((d) => ({
    ...d,
    volume_tonnes: Math.round(d.volume_kg / 100) / 10,
  }));
  const { domain: volumeDomain, ticks: volumeTicks } = niceZeroDomain(
    Math.max(...formatted.map((d) => d.volume_tonnes))
  );
  const {
    data: chartData,
    xKey: dateKey,
    domain: dateDomain,
    ticks: dateTicks,
    tick: DateTick,
  } = weeklyDateAxis(formatted, "week_start");

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Volume per Week</h2>
        <span className={styles.unit}>tonnes lifted</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
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
            domain={volumeDomain}
            ticks={volumeTicks}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="volume_tonnes"
            fill="#f5a623"
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            barSize={BAR_WIDTH}
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

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
