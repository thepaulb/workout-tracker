const DAY_MS = 24 * 60 * 60 * 1000;

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
export function weeklyDateAxis(data, dateKey = "date") {
  if (!data.length) {
    return { data: [], xKey: "__ms", domain: [0, 1], ticks: [], tick: () => null };
  }

  const withMs = data.map((d) => ({ ...d, __ms: new Date(d[dateKey]).getTime() }));
  const msValues = withMs.map((d) => d.__ms);
  const minMs = Math.min(...msValues);
  const maxMs = Math.max(...msValues);

  const ticks = [];
  for (let t = minMs + 7 * DAY_MS; t <= maxMs; t += 7 * DAY_MS) ticks.push(t);
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
    tick: makeWeeklyTickComponent(ticks),
  };
}

function makeWeeklyTickComponent(ticks) {
  return function DateTick({ x, y, payload }) {
    const date = new Date(payload.value);
    const tickIndex = ticks.indexOf(payload.value);
    const prevDate = tickIndex > 0 ? new Date(ticks[tickIndex - 1]) : null;
    const monthChanged =
      !prevDate ||
      date.getMonth() !== prevDate.getMonth() ||
      date.getFullYear() !== prevDate.getFullYear();

    const monthLabel = date.toLocaleDateString("en-GB", {
      month: "short",
      ...(prevDate && date.getFullYear() !== prevDate.getFullYear()
        ? { year: "2-digit" }
        : {}),
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
          {date.getDate()}
        </text>
        {monthChanged && (
          <text
            x={0}
            y={0}
            dy={26}
            textAnchor="middle"
            fill="#6b6e74"
            fontSize={10}
            fontFamily="inherit"
          >
            {monthLabel}
          </text>
        )}
      </g>
    );
  };
}

// --- legacy category-axis approach, still used by the bar charts ---------

// Picks which data points get an axis tick, spaced roughly a week apart.
// Anchored to the most recent point and walking backward — so the latest
// entry is always labeled, and short ranges (e.g. a handful of sessions
// within the same week) naturally collapse to just an end tick, or a
// start+end pair if they happen to span close to the full 7 days.
export function selectWeeklyTicks(data, dateKey = "date") {
  if (!data.length) return [];

  const ticks = [];
  let lastPicked = null;
  for (let i = data.length - 1; i >= 0; i--) {
    const d = new Date(data[i][dateKey]);
    if (!lastPicked || (lastPicked - d) / DAY_MS >= 7) {
      ticks.push(data[i][dateKey]);
      lastPicked = d;
    }
  }
  return ticks.reverse();
}

// Custom X-axis tick for date-based charts: shows just the day number
// ("5") to stay uncluttered, spaced to roughly weekly intervals (see
// selectWeeklyTicks), and adds a small month (and year, if that changed
// too) label under the tick where the month rolls over — so "All" ranges
// spanning months/years stay readable without cluttering every tick with
// a full date.
//
// Skipped ticks render nothing (rather than being left out of the axis's
// `ticks` prop) because on a category axis, Recharts derives point/line
// positions from that same prop — trimming it desyncs the plotted line
// from its points.
export function makeDateTick(data, dateKey = "date") {
  const ticks = selectWeeklyTicks(data, dateKey);
  const selected = new Set(ticks);

  return function DateTick({ x, y, payload }) {
    if (!selected.has(payload.value)) return null;

    const date = new Date(payload.value);
    // Compare against the *previous displayed tick*, not the previous raw
    // data point — most data points aren't shown, so a month can roll
    // over between two points that are both skipped (e.g. Aug 1 and Aug 5
    // are both hidden but bracket the visible Jul 20 / Aug 5 ticks).
    const tickIndex = ticks.indexOf(payload.value);
    const prevDate = tickIndex > 0 ? new Date(ticks[tickIndex - 1]) : null;
    const monthChanged =
      prevDate &&
      (date.getMonth() !== prevDate.getMonth() ||
        date.getFullYear() !== prevDate.getFullYear());

    const monthLabel = date.toLocaleDateString("en-GB", {
      month: "short",
      ...(prevDate && date.getFullYear() !== prevDate.getFullYear()
        ? { year: "2-digit" }
        : {}),
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
          {date.getDate()}
        </text>
        {monthChanged && (
          <text
            x={0}
            y={0}
            dy={26}
            textAnchor="middle"
            fill="#6b6e74"
            fontSize={10}
            fontFamily="inherit"
          >
            {monthLabel}
          </text>
        )}
      </g>
    );
  };
}
