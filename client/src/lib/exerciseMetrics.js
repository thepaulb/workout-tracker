export function isCardio(exercise) {
  return exercise?.category === "cardio";
}

export function isTimed(exercise) {
  return exercise?.progression_type === "time";
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
  if (set.progression_type === "time") return formatTimedSet(set);
  if (set.progression_type === "pace") return formatCardioSet(set);

  const parts = [];
  if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weight_kg) parts.push(`${set.weight_kg}kg`);
  if (set.weight_note) parts.push(set.weight_note);
  if (set.rpe != null) parts.push(`RPE ${set.rpe}`);
  return parts.join(" · ") || "—";
}

function formatCardioSet(set) {
  const parts = [];
  if (set.distance_m) parts.push(formatDistanceKm(set.distance_m));
  if (set.duration_min) parts.push(minutesToClock(set.duration_min));
  if (set.speed_kmh) parts.push(`${set.speed_kmh}km/h`);
  return parts.join(" · ") || "—";
}

function formatTimedSet(set) {
  const parts = [];
  if (set.reps > 1) parts.push(`${set.reps} reps`);
  if (set.duration_min != null) parts.push(minutesToClock(set.duration_min));
  if (set.rpe != null) parts.push(`RPE ${set.rpe}`);
  return parts.join(" · ") || "—";
}

export function formatDistanceKm(meters) {
  if (!meters) return "—";
  return `${parseFloat((meters / 1000).toFixed(2))}km`;
}

// Estimated 1RM for a single set. When a hard-enough RPE is logged
// (>= 7), uses RPE-adjusted Epley (accounts for reps left in the tank);
// otherwise falls back to plain Epley — the original, un-adjusted formula.
export function calculateE1RM(weight, reps, rpe) {
  if (!weight || !reps) return null;
  if (rpe != null && rpe >= 7) {
    const rir = 10 - rpe;
    return weight * (1 + (reps + rir) / 30);
  }
  return weight * (1 + reps / 30);
}

// "3d ago" / "Today" / "Yesterday" from a plain "YYYY-MM-DD" date string.
export function formatDaysAgo(dateStr) {
  if (!dateStr) return "—";
  const days = daysSinceDate(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function daysSinceDate(dateStr) {
  const last = new Date(dateStr);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((todayUtc - last.getTime()) / 86400000));
}

// Best e1RM among a batch of sets (e.g. one day's sets) that have both
// weight_kg and reps. Returns null if none qualify.
export function bestE1RMFromSets(sets) {
  const weighted = sets.filter((s) => s.weight_kg && s.reps);
  if (!weighted.length) return null;
  const best = Math.max(
    ...weighted.map((s) => calculateE1RM(s.weight_kg, s.reps, s.rpe)),
  );
  return Math.round(best * 10) / 10;
}

// Best reps among a batch of sets. Returns null if none have reps logged.
export function bestRepsFromSets(sets) {
  const repSets = sets.filter((s) => s.reps);
  return repSets.length ? Math.max(...repSets.map((s) => s.reps)) : null;
}

// Best pace among a batch of sets. Returns null if none have speed logged.
export function bestSpeedFromSets(sets) {
  const paced = sets.filter((s) => s.speed_kmh);
  return paced.length ? Math.max(...paced.map((s) => s.speed_kmh)) : null;
}

// Best hold time among a batch of sets. Returns null if none have a
// duration logged.
export function bestDurationFromSets(sets) {
  const timed = sets.filter((s) => s.duration_min);
  return timed.length ? Math.max(...timed.map((s) => s.duration_min)) : null;
}

// Flags come straight off the set — the server marks each one the first
// time it exceeds every prior set's value for that metric (see the PR
// query comments in routes/exercises.js and routes/sessions.js), so a
// tied or repeated value never re-fires the badge.
export function getSetPRFlags(set) {
  const isWeightPR = Boolean(set.is_weight_pr);
  const isRepsPR = Boolean(set.is_reps_pr);
  const isDistancePR = Boolean(set.is_distance_pr);
  const isPacePR = Boolean(set.is_pace_pr);
  const isDurationPR = Boolean(set.is_duration_pr);
  return {
    isWeightPR,
    isRepsPR,
    isDistancePR,
    isPacePR,
    isDurationPR,
    isPR: isWeightPR || isRepsPR || isDistancePR || isPacePR || isDurationPR,
  };
}
