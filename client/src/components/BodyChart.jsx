import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { weeklyDateAxis } from "../lib/DateAxisTick";
import { niceStepDomain } from "../lib/niceAxis";
import styles from "./BodyChart.module.scss";

export default function BodyChart({ data }) {
  if (!data.length) return null;

  const hasBodyFat = data.some((d) => d.body_fat_pct);
  const bodyweights = data.map((d) => d.bodyweight_kg);
  const { domain: weightDomain, ticks: weightTicks } = niceStepDomain(
    Math.min(...bodyweights),
    Math.max(...bodyweights),
    2
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
      <h2 className={styles.title}>Body Composition Over Time</h2>
      <ResponsiveContainer width="100%" height={260}>
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
            yAxisId="weight"
            domain={weightDomain}
            ticks={weightTicks}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${v}kg`}
          />
          {hasBodyFat && (
            <YAxis
              yAxisId="fat"
              orientation="right"
              tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {hasBodyFat && (
            <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#6b6e74" }} />
          )}
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="bodyweight_kg"
            name="Bodyweight"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#a78bfa", r: 5, strokeWidth: 0 }}
          />
          {hasBodyFat && (
            <Line
              yAxisId="fat"
              type="monotone"
              dataKey="body_fat_pct"
              name="Body Fat %"
              stroke="#f97058"
              strokeWidth={2}
              dot={{ fill: "#f97058", r: 3, strokeWidth: 0 }}
              activeDot={{ fill: "#f97058", r: 5, strokeWidth: 0 }}
            />
          )}
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
      <div className={styles.tooltipWeight}>{d.bodyweight_kg}kg</div>
      {d.body_fat_pct && (
        <div className={styles.tooltipFat}>{d.body_fat_pct}% body fat</div>
      )}
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
