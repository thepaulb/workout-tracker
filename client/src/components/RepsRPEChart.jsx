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
import { buildChartData } from "./RepsRPEChart.data";
import styles from "./RepsRPEChart.module.scss";

const DAY_MS = 24 * 60 * 60 * 1000;
const JITTER_DAY_FRACTION = 0.15; // keeps a date's dots inside its own column

// Strip plot: every set gets its own dot at its rep count, instead of
// collapsing a day down to one "top set". Dots for the same date are
// spread with a small horizontal jitter so ties (e.g. two sets of 10)
// don't sit exactly on top of each other. RPE, when logged, tints the
// dot along a green (easy) -> coral (max effort) gradient; sets with no
// RPE logged get a neutral grey rather than disappearing.
export default function RepsRPEChart({ history }) {
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

  const maxReps = Math.max(...chartData.map((d) => d.reps));
  const { domain: repsDomain, ticks: repsTicks } = niceZeroDomain(maxReps);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Reps per Set</h2>
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
            dataKey="reps"
            domain={repsDomain}
            ticks={repsTicks}
            tick={{ fill: "#6b6e74", fontSize: 11, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={chartData} dataKey="reps" shape={RepDot} isAnimationActive={false} />
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

function RepDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={rpeColor(payload.rpe)} fillOpacity={0.85} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{formatFullDate(d.date)}</div>
      <div className={styles.tooltipReps}>{d.reps} reps</div>
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
