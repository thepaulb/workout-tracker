export function isCardio(exercise) {
  return exercise?.category === "cardio";
}

// "mm:ss" -> decimal minutes (e.g. "24:30" -> 24.5)
export function clockToMinutes(clock) {
  if (!clock) return null;
  const [mm, ss = "0"] = clock.split(":");
  const minutes = parseInt(mm, 10) || 0;
  const seconds = parseInt(ss, 10) || 0;
  return minutes + seconds / 60;
}

// decimal minutes -> "mm:ss" (e.g. 24.5 -> "24:30")
export function minutesToClock(minutes) {
  const totalSeconds = Math.round(minutes * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export function computeSpeedKmh(distanceKm, minutes) {
  if (!distanceKm || !minutes) return null;
  return Math.round((distanceKm / (minutes / 60)) * 100) / 100;
}

export function formatSet(set) {
  if (set.distance_m || set.duration_min) return formatCardioSet(set);

  const parts = [];
  if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weight_kg) parts.push(`${set.weight_kg}kg`);
  if (set.weight_note) parts.push(set.weight_note);
  return parts.join(" · ") || "—";
}

function formatCardioSet(set) {
  const parts = [];
  if (set.distance_m) parts.push(formatDistanceKm(set.distance_m));
  if (set.duration_min) parts.push(minutesToClock(set.duration_min));
  if (set.speed_kmh) parts.push(`${set.speed_kmh}km/h`);
  return parts.join(" · ") || "—";
}

export function formatDistanceKm(meters) {
  if (!meters) return "—";
  return `${parseFloat((meters / 1000).toFixed(2))}km`;
}
