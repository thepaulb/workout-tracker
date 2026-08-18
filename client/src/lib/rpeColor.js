// Shared green (easy) -> coral (max effort) RPE color gradient, used by
// every strip-plot chart that tints dots by RPE.
export const RPE_MIN = 6;
export const RPE_MAX = 10;
export const NO_RPE_COLOR = "#54575e";

const RPE_LOW_RGB = [62, 207, 142]; // $color-green
const RPE_HIGH_RGB = [249, 112, 88]; // $color-coral

export function rpeColor(rpe) {
  if (rpe == null) return NO_RPE_COLOR;
  const t = Math.min(1, Math.max(0, (rpe - RPE_MIN) / (RPE_MAX - RPE_MIN)));
  const [r, g, b] = RPE_LOW_RGB.map((c, i) => Math.round(c + (RPE_HIGH_RGB[i] - c) * t));
  return `rgb(${r}, ${g}, ${b})`;
}
