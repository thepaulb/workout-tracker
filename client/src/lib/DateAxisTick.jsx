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
