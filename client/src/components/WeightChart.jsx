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
import { weeklyDateAxis } from "../lib/DateAxisTick";
import { niceStepDomain } from "../lib/niceAxis";
import { buildChartData, DEFAULT_GAP_BREAK_DAYS } from "./WeightChart.data";
import styles from "./WeightChart.module.scss";

export default function WeightChart({ history, gapBreakDays = DEFAULT_GAP_BREAK_DAYS }) {
  const data = buildChartData(history, gapBreakDays);
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

  const segmentCount = Math.max(...data.map((d) => d.__segment)) + 1;
  const segments = Array.from({ length: segmentCount }, (_, i) => i);

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
          {segments.map((s) => (
            <Line
              key={`weight-${s}`}
              type="monotone"
              dataKey={`weight_${s}`}
              name="Weight"
              legendType={s === 0 ? "line" : "none"}
              stroke="#4a9eff"
              strokeWidth={2}
              dot={{ fill: "#4a9eff", r: 3, strokeWidth: 0 }}
              activeDot={{ fill: "#4a9eff", r: 5, strokeWidth: 0 }}
            />
          ))}
          {segments.map((s) => (
            <Line
              key={`e1rm-${s}`}
              type="monotone"
              dataKey={`oneRepMax_${s}`}
              name="e1RM"
              legendType={s === 0 ? "line" : "none"}
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
              activeDot={{ fill: "#a78bfa", r: 5, strokeWidth: 0 }}
              connectNulls
            />
          ))}
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

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
