import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExercise } from "../api/exercises";
import WeightChart from "../components/WeightChart";
import RepsRPEChart from "../components/RepsRPEChart";
import TimeRPEChart from "../components/TimeRPEChart";
import PRBadge from "../components/PRBadge";
import {
  formatSet,
  isCardio,
  formatDistanceKm,
  getSetPRFlags,
  formatDaysAgo,
  bestE1RMFromSets,
  bestRepsFromSets,
  bestSpeedFromSets,
  bestDurationFromSets,
  minutesToClock,
} from "../lib/exerciseMetrics";

import styles from "./ExerciseDetail.module.scss";

const RANGES = [
  { key: "1w", label: "1W", days: 7 },
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
];

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("all");

  useEffect(() => {
    getExercise(id)
      .then(setExercise)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  const grouped = groupBySession(exercise.history).reverse();
  const cardio = isCardio(exercise);
  const isWeighted = exercise.progression_type === "weight";
  const timed = exercise.progression_type === "time";
  const chartHistory = filterByRange(exercise.history, range);
  const currentE1RM = !cardio && !timed && isWeighted ? getCurrentE1RM(exercise.history) : null;
  const currentTopSetReps =
    !cardio && !timed && currentE1RM == null ? getCurrentTopSetReps(exercise.history) : null;
  const currentHoldTime = timed ? getCurrentHoldTime(exercise.history) : null;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header className={styles.header}>
        <h1>{exercise.name}</h1>
        <div className={styles.tags}>
          <span className={styles.tag}>{exercise.category}</span>
          <span className={styles.tag}>{exercise.equipment}</span>
          {exercise.related_exercise && (
            <button
              className={styles.relatedTag}
              onClick={() => navigate(`/exercises/${exercise.related_exercise.id}`)}
            >
              ↔ {exercise.related_exercise.name}
            </button>
          )}
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {getLastTrained(exercise.history)}
          </span>
          <span className={styles.statLabel}>Last Trained</span>
        </div>
        {cardio ? (
          <>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getCurrentPace(exercise.history)}
              </span>
              <span className={styles.statLabel}>Current Pace</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getBestDistance(exercise.history)}
              </span>
              <span className={styles.statLabel}>Best Distance</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getBestPace(exercise.history)}
              </span>
              <span className={styles.statLabel}>Best Pace</span>
            </div>
          </>
        ) : timed ? (
          <>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {currentHoldTime != null ? minutesToClock(currentHoldTime) : "—"}
              </span>
              <span className={styles.statLabel}>Current Hold Time</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getBestHoldTime(exercise.history)}
              </span>
              <span className={styles.statLabel}>Best Hold Time</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {currentE1RM != null
                  ? `${currentE1RM}kg`
                  : (currentTopSetReps ?? "—")}
              </span>
              <span className={styles.statLabel}>
                {currentE1RM != null ? "Current e1RM" : "Current Top Set"}
              </span>
            </div>
            {isWeighted && (
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {getBestWeight(exercise.history)}
                </span>
                <span className={styles.statLabel}>Best Weight</span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getBestReps(exercise.history)}
              </span>
              <span className={styles.statLabel}>Best Reps</span>
            </div>
          </>
        )}
      </div>

      {!cardio && (
        <>
          <div className={styles.rangeFilter}>
            <button
              className={`${styles.rangeButton} ${range === "all" ? styles.rangeButtonActive : ""}`}
              onClick={() => setRange("all")}
            >
              All
            </button>
            {RANGES.map((r) => (
              <button
                key={r.key}
                className={`${styles.rangeButton} ${range === r.key ? styles.rangeButtonActive : ""}`}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {isWeighted && <WeightChart history={chartHistory} />}
          {timed ? (
            <TimeRPEChart history={chartHistory} />
          ) : (
            <RepsRPEChart history={chartHistory} />
          )}
        </>
      )}

      <ul className={styles.history}>
        {grouped.map(({ date, session_id, sets }) => (
          <li key={session_id} className={styles.session}>
            <div className={styles.sessionHeader}>
              <span className={styles.date}>{formatDate(date)}</span>
              <span className={styles.setCount}>{sets.length} sets</span>
            </div>
            <ul className={styles.sets}>
              {sets.map((set) => {
                const { isWeightPR, isRepsPR, isDistancePR, isPacePR, isDurationPR, isPR } =
                  getSetPRFlags(set);

                return (
                  <li
                    key={set.id}
                    className={`${styles.set} ${isPR ? styles.prSet : ""}`}
                  >
                    <span className={styles.setNum}>#{set.set_number}</span>
                    <span className={styles.detail}>
                      {formatSet(set)}
                      {isWeightPR && <PRBadge type="weight" />}
                      {isRepsPR && <PRBadge type="reps" />}
                      {isDistancePR && <PRBadge type="distance" />}
                      {isPacePR && <PRBadge type="pace" />}
                      {isDurationPR && <PRBadge type="duration" />}
                    </span>
                    {set.is_ladder ? (
                      <span className={styles.ladder}>
                        Ladder {set.ladder_step}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function filterByRange(history, rangeKey) {
  if (rangeKey === "all") return history;
  const range = RANGES.find((r) => r.key === rangeKey);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range.days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return history.filter((set) => set.date >= cutoffStr);
}

function groupBySession(history) {
  const map = {};
  for (const set of history) {
    if (!map[set.session_id]) {
      map[set.session_id] = {
        date: set.date,
        session_id: set.session_id,
        sets: [],
      };
    }
    map[set.session_id].sets.push(set);
  }
  return Object.values(map);
}

function getLastTrained(history) {
  if (!history.length) return "—";
  const lastDate = history.reduce(
    (latest, s) => (s.date > latest ? s.date : latest),
    history[0].date,
  );
  return formatDaysAgo(lastDate);
}

// Sets on the most recent date that has at least one set matching `hasField`
// — used to scope the "current" stats to today's-most-recent-session-worth
// of sets, as opposed to the all-time PRs below.
function mostRecentDaySets(history, hasField) {
  const matching = history.filter((s) => s[hasField]);
  if (!matching.length) return [];
  const lastDate = matching.reduce(
    (latest, s) => (s.date > latest ? s.date : latest),
    matching[0].date,
  );
  return matching.filter((s) => s.date === lastDate);
}

// Best e1RM among sets on the most recent date that has a weighted set —
// "current" strength, as opposed to getBestWeight's all-time PR. Sets
// without weight_kg (e.g. warm-ups logged as bodyweight) don't count.
function getCurrentE1RM(history) {
  return bestE1RMFromSets(mostRecentDaySets(history, "weight_kg"));
}

// Fallback for exercises with no weighted sets at all (e.g. bodyweight-only)
// — the best reps on the most recent date, since e1RM doesn't apply.
function getCurrentTopSetReps(history) {
  return bestRepsFromSets(mostRecentDaySets(history, "reps"));
}

function getCurrentPace(history) {
  const best = bestSpeedFromSets(mostRecentDaySets(history, "speed_kmh"));
  return best != null ? `${best}km/h` : "—";
}

// Best hold time on the most recent date that has a timed set — "current"
// hold, as opposed to getBestHoldTime's all-time PR.
function getCurrentHoldTime(history) {
  return bestDurationFromSets(mostRecentDaySets(history, "duration_min"));
}

function getBestHoldTime(history) {
  const durations = history.map((s) => s.duration_min).filter(Boolean);
  return durations.length ? minutesToClock(Math.max(...durations)) : "—";
}

function getBestWeight(history) {
  const weights = history.map((s) => s.weight_kg).filter(Boolean);
  return weights.length ? `${Math.max(...weights)}kg` : "—";
}

function getBestReps(history) {
  const reps = history.map((s) => s.reps).filter(Boolean);
  return reps.length ? Math.max(...reps) : "—";
}

function getBestDistance(history) {
  const distances = history.map((s) => s.distance_m).filter(Boolean);
  return distances.length ? formatDistanceKm(Math.max(...distances)) : "—";
}

function getBestPace(history) {
  const speeds = history.map((s) => s.speed_kmh).filter(Boolean);
  return speeds.length ? `${Math.max(...speeds)}km/h` : "—";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
