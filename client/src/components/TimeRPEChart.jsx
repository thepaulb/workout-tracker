import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { weeklyDateAxis } from "../lib/DateAxisTick";
import { niceZeroDomain } from "../lib/niceAxis";
import { RPE_MIN, RPE_MAX, NO_RPE_COLOR, rpeColor } from "../lib/rpeColor";
import { minutesToClock } from "../lib/exerciseMetrics";
import { buildChartData } from "./TimeRPEChart.data";
import styles from "./RepsRPEChart.module.scss";

const DAY_MS = 24 * 60 * 60 * 1000;
const JITTER_DAY_FRACTION = 0.15; // keeps a date's dots inside its own column

// Same strip-plot pattern as RepsRPEChart, but for isometric holds: each
// set gets a dot at its hold time instead of its rep count, since reps are
// ~always 1 for a timed exercise and aren't worth plotting.
export default function TimeRPEChart({ history }) {
  const jittered = withJitter(buildChartData(history));
  if (!jittered.length) return null;

  const {
    data: dateJoined,
    xKey: dateKey,
    domain: dateDomain,
    ticks: dateTicks,
    tick: DateTick,
  } = weeklyDateAxis(jittered);

  const chartData = dateJoined.map((d) => ({
    ...d,
    [dateKey]: d[dateKey] + d.jitterDays * DAY_MS,
  }));

  const maxDuration = Math.max(...chartData.map((d) => d.duration));
  const { domain: durationDomain, ticks: durationTicks } = niceZeroDomain(maxDuration);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Hold Time per Set</h2>
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
            dataKey="duration"
            domain={durationDomain}
            ticks={durationTicks}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            tickFormatter={minutesToClock}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={chartData} dataKey="duration" shape={TimeDot} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: rpeColor(RPE_MIN) }} />
          RPE {RPE_MIN}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: rpeColor(RPE_MAX) }} />
          RPE {RPE_MAX}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: NO_RPE_COLOR }} />
          No RPE logged
        </span>
      </div>
    </div>
  );
}

function TimeDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={rpeColor(payload.rpe)} fillOpacity={0.85} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{formatFullDate(d.date)}</div>
      <div className={styles.tooltipReps}>{minutesToClock(d.duration)}</div>
      {d.rpe != null && <div className={styles.tooltipRpe}>RPE {d.rpe}</div>}
    </div>
  );
}

// Spreads same-date dots evenly around their date so a day with several
// sets doesn't stack them into one indistinguishable blob.
function withJitter(data) {
  const byDate = {};
  for (const d of data) {
    (byDate[d.date] ??= []).push(d);
  }
  return Object.values(byDate).flatMap((sets) =>
    sets.map((s, i) => ({
      ...s,
      jitterDays: (i - (sets.length - 1) / 2) * JITTER_DAY_FRACTION,
    })),
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
