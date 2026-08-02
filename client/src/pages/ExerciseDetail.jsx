import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExercise } from "../api/exercises";
import { getPRs } from "../api/progress";
import WeightChart from "../components/WeightChart";
import RepsChart from "../components/RepsChart";
import PRBadge from "../components/PRBadge";
import {
  formatSet,
  isCardio,
  formatDistanceKm,
  getSetPRFlags,
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
  const [prs, setPRs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("all");

  useEffect(() => {
    Promise.all([getExercise(id), getPRs()])
      .then(([ex, p]) => {
        setExercise(ex);
        setPRs(p);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  const grouped = groupBySession(exercise.history).reverse();
  const cardio = isCardio(exercise);
  const chartHistory = filterByRange(exercise.history, range);
  const pr = prs[exercise.id];

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
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{grouped.length}</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{exercise.history.length}</span>
          <span className={styles.statLabel}>Total Sets</span>
        </div>
        {cardio ? (
          <>
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
        ) : (
          <>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {getBestWeight(exercise.history)}
              </span>
              <span className={styles.statLabel}>Best Weight</span>
            </div>
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

          <WeightChart history={chartHistory} />
          <RepsChart history={chartHistory} />
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
                const { isWeightPR, isRepsPR, isDistancePR, isPacePR, isPR } =
                  getSetPRFlags(set, pr);

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
