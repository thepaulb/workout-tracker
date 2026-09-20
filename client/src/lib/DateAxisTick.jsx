const DAY_MS = 24 * 60 * 60 * 1000;

// Picks a tick cadence from the chart's rendered width so date labels
// thin out on narrow screens instead of overlapping. Stays weekly once
// there's room for it.
export function stepDaysForWidth(width) {
  if (width >= 600) return 7;
  if (width >= 400) return 14;
  return 21;
}

// Prepares props for a fixed-interval weekly x-axis: adds a numeric
// timestamp field to each row (so points plot at their true calendar
// position instead of being evenly spaced by index) and computes gridlines
// every 7 days starting from the earliest date in view — so ticks land on
// a fixed weekly cadence regardless of which days actually have data (e.g.
// view starts 9 Jul -> ticks at 16, 23, 30, even if you only trained on
// the 23rd).
//
// A category axis (the old approach) can't do this: its tick positions
// are 1:1 with data array entries, so a day with no workout has nowhere
// on the axis to put a tick. This switches the axis to numeric/time-based
// so ticks can land on dates with no data point.
//
// options.labels picks the tick style: "day" (default) keeps the weekly
// cadence and labels each tick with just the date number; "month" places
// ticks on the 1st of each month and labels them with just the month, for
// longer ranges where individual dates are noise. options.width (px) lets
// month mode thin ticks out so labels don't collide on narrow charts.
export function weeklyDateAxis(data, dateKey = "date", stepDays = 7, options = {}) {
  const { labels = "day", width } = options;
  if (!data.length) {
    return { data: [], xKey: "__ms", domain: [0, 1], ticks: [], tick: () => null };
  }

  const withMs = data.map((d) => ({ ...d, __ms: new Date(d[dateKey]).getTime() }));
  const msValues = withMs.map((d) => d.__ms);
  const minMs = Math.min(...msValues);
  const maxMs = Math.max(...msValues);

  const ticks = labels === "month"
    ? monthStartTicks(minMs, maxMs, width)
    : weeklyTicks(minMs, maxMs, stepDays);
  if (!ticks.length) {
    // Range too short for a weekly grid — show the endpoints rather than
    // leaving the axis blank.
    ticks.push(minMs);
    if (maxMs !== minMs) ticks.push(maxMs);
  }

  const padding = DAY_MS; // keeps edge dots from sitting flush on the axis
  return {
    data: withMs,
    xKey: "__ms",
    domain: [minMs - padding, maxMs + padding],
    ticks,
    tick: makeTickComponent(ticks, labels),
  };
}

function weeklyTicks(minMs, maxMs, stepDays) {
  const ticks = [];
  for (let t = minMs + stepDays * DAY_MS; t <= maxMs; t += stepDays * DAY_MS) ticks.push(t);
  return ticks;
}

const MIN_MONTH_TICK_SPACING_PX = 40;

// First-of-month timestamps inside [minMs, maxMs], thinned to every nth
// month when the chart is too narrow to fit them all.
function monthStartTicks(minMs, maxMs, width) {
  const ticks = [];
  const start = new Date(minMs);
  let cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (start.getDate() === 1 && start.getHours() === 0) {
    cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  }
  while (cursor.getTime() <= maxMs) {
    ticks.push(cursor.getTime());
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const maxTicks = width ? Math.max(2, Math.floor((width - 60) / MIN_MONTH_TICK_SPACING_PX)) : Infinity;
  if (ticks.length <= maxTicks) return ticks;
  const stride = Math.ceil(ticks.length / maxTicks);
  return ticks.filter((_, i) => i % stride === 0);
}

function makeTickComponent(ticks, labels) {
  return function DateTick({ x, y, payload }) {
    const date = new Date(payload.value);
    const tickIndex = ticks.indexOf(payload.value);
    const prevDate = tickIndex > 0 ? new Date(ticks[tickIndex - 1]) : null;
    const yearChanged = prevDate && date.getFullYear() !== prevDate.getFullYear();

    if (labels === "month") {
      const label = date.toLocaleDateString("en-GB", {
        month: "short",
        ...(yearChanged ? { year: "2-digit" } : {}),
      });
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={12}
            textAnchor="middle"
            fill="#6b6e74"
            fontSize={11}
            fontFamily="inherit"
          >
            {label}
          </text>
        </g>
      );
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="middle"
          fill="#6b6e74"
          fontSize={11}
          fontFamily="inherit"
        >
          {date.getDate()}
        </text>
      </g>
    );
  };
}
