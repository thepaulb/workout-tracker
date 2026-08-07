// Snaps a Y axis domain to whole multiples of `step` so ticks read as
// clean numbers (80, 85, 90...) instead of whatever the data happens to
// be. Only affects the axis/gridlines — the underlying data is untouched.
export function niceStepDomain(min, max, step) {
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (lo === min) lo -= step;
  if (hi === max) hi += step;
  if (lo === hi) {
    lo -= step;
    hi += step;
  }

  const ticks = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return { domain: [lo, hi], ticks };
}

// For bar charts, where the axis must start at 0 (truncating the baseline
// would distort bar magnitudes). Picks a "nice" step — 1/2/5 x a power of
// ten — that gives roughly `tickCount` gridlines, then rounds the domain
// max up to a multiple of it.
export function niceZeroDomain(max, tickCount = 5) {
  if (!(max > 0)) return { domain: [0, 1], ticks: [0, 1] };

  const rawStep = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  const step = niceResidual * magnitude;

  const domainMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = 0; t <= domainMax + step / 2; t += step) {
    ticks.push(Math.round(t * 1000) / 1000);
  }
  return { domain: [0, domainMax], ticks };
}
