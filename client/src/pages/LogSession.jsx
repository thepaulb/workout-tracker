import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession } from "../api/sessions";
import { getExercises } from "../api/exercises";
import { createSet, deleteSet, getLastSet } from "../api/sets";
import { getPRs } from "../api/progress";
import { checkGoals } from "../api/goals";
import {
  isCardio,
  formatSet,
  clockToMinutes,
  computeSpeedKmh,
} from "../lib/exerciseMetrics";
import RPEInput from "../components/RPEInput";

import styles from "./LogSession.module.scss";

export default function LogSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("session"); // session | pick | log
  const [selectedExercise, setSelected] = useState(null);
  const [lastSet, setLastSet] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reps: "",
    weight_kg: "",
    rest_min: "",
    distance_km: "",
    time_str: "",
    notes: "",
    rpe: null,
  });

  const [prs, setPRs] = useState({});

  useEffect(() => {
    Promise.all([getSession(id), getExercises(), getPRs()])
      .then(([s, e, p]) => {
        setSession(s);
        setExercises(e);
        setPRs(p);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function selectExercise(exercise) {
    setSelected(exercise);
    const last = await getLastSet(exercise.id);
    setLastSet(last);
    setForm({
      reps: exercise.progression_type === "time" ? "1" : "",
      weight_kg: last?.weight_kg ?? "",
      rest_min: "",
      distance_km: "",
      time_str: "",
      notes: "",
      rpe: null,
    });
    setView("log");
  }

  const cardio = isCardio(selectedExercise);
  const timed = selectedExercise?.progression_type === "time";
  const currentPR = selectedExercise ? prs[selectedExercise.id] : null;

  const durationMin =
    (cardio || timed) && form.time_str ? clockToMinutes(form.time_str) : null;
  const distanceM = cardio && form.distance_km ? parseFloat(form.distance_km) * 1000 : null;
  const speedKmh = cardio
    ? computeSpeedKmh(parseFloat(form.distance_km) || null, durationMin)
    : null;

  const isWeightPR =
    !cardio &&
    !timed &&
    currentPR &&
    form.weight_kg &&
    parseFloat(form.weight_kg) >= currentPR.best_weight;
  const isRepsPR =
    !cardio &&
    !timed &&
    currentPR &&
    form.reps &&
    parseInt(form.reps) >= currentPR.best_reps;
  const isDistancePR =
    cardio && currentPR && distanceM && distanceM >= currentPR.best_distance;
  const isPacePR =
    cardio && currentPR && speedKmh && speedKmh >= currentPR.best_speed;
  const isDurationPR =
    timed && currentPR && durationMin && durationMin >= currentPR.best_duration;
  const isPR = isWeightPR || isRepsPR || isDistancePR || isPacePR || isDurationPR;

  async function handleLogSet() {
    if (cardio && (!form.distance_km || !form.time_str)) return;
    if (timed && !form.time_str) return;
    if (!cardio && !timed && !form.reps) return;
    setSaving(true);
    try {
      const setsForExercise = session.sets.filter(
        (s) => s.exercise_id === selectedExercise.id,
      );
      const payload = cardio
        ? {
            session_id: parseInt(id),
            exercise_id: selectedExercise.id,
            set_number: setsForExercise.length + 1,
            distance_m: distanceM,
            duration_min: durationMin,
            speed_kmh: speedKmh,
            notes: form.notes || null,
            is_ladder: false,
          }
        : timed
          ? {
              session_id: parseInt(id),
              exercise_id: selectedExercise.id,
              set_number: setsForExercise.length + 1,
              reps: form.reps ? parseInt(form.reps) : 1,
              duration_min: durationMin,
              rest_min: form.rest_min ? parseFloat(form.rest_min) : null,
              notes: form.notes || null,
              is_ladder: false,
              rpe: form.rpe,
            }
          : {
              session_id: parseInt(id),
              exercise_id: selectedExercise.id,
              set_number: setsForExercise.length + 1,
              reps: parseInt(form.reps),
              weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
              rest_min: form.rest_min ? parseFloat(form.rest_min) : null,
              notes: form.notes || null,
              is_ladder: false,
              rpe: form.rpe,
            };
      await createSet(payload);
      const updated = await getSession(id);
      await checkGoals(selectedExercise.id);
      setSession(updated);
      setForm((f) =>
        cardio
          ? { ...f, distance_km: "", time_str: "", notes: "" }
          : timed
            ? { ...f, reps: "1", time_str: "", notes: "", rpe: null }
            : { ...f, reps: "", notes: "", rpe: null },
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSet(setId) {
    await deleteSet(setId);
    const updated = await getSession(id);
    setSession(updated);
  }

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = groupByCategory(filtered);

  if (loading) return <div className={styles.state}>Loading...</div>;

  return (
    <div className={styles.page}>
      {/* ── Session view ── */}
      {view === "session" && (
        <>
          <div className={styles.topBar}>
            <button
              className={styles.back}
              onClick={() => navigate(`/sessions/${id}`)}
            >
              ← Done
            </button>
            <span className={styles.sessionDate}>
              {formatDate(session.date)}
            </span>
          </div>

          <div className={styles.sets}>
            {session.sets.length === 0 && (
              <div className={styles.empty}>
                No sets logged yet — add an exercise to start
              </div>
            )}
            {groupSetsByExercise(session.sets).map(
              ({ exercise_name, exercise_id, sets }) => (
                <div key={exercise_id} className={styles.exerciseGroup}>
                  <div className={styles.exerciseName}>{exercise_name}</div>
                  <ul className={styles.setList}>
                    {sets.map((set) => (
                      <li key={set.id} className={styles.setRow}>
                        <span className={styles.setNum}>#{set.set_number}</span>
                        <span className={styles.setDetail}>
                          {formatSet(set)}
                        </span>
                        <button
                          className={styles.deleteSet}
                          onClick={() => handleDeleteSet(set.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>

          <button
            className={styles.addExercise}
            onClick={() => {
              setSearch("");
              setView("pick");
            }}
          >
            + Add Exercise
          </button>
        </>
      )}

      {/* ── Exercise picker ── */}
      {view === "pick" && (
        <>
          <div className={styles.topBar}>
            <button className={styles.back} onClick={() => setView("session")}>
              ← Back
            </button>
            <span className={styles.sessionDate}>Select Exercise</span>
          </div>

          <input
            className={styles.search}
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className={styles.exerciseList}>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className={styles.pickGroup}>
                <div className={styles.pickCategory}>{category}</div>
                {items.map((ex) => (
                  <button
                    key={ex.id}
                    className={styles.pickRow}
                    onClick={() => selectExercise(ex)}
                  >
                    <span>{ex.name}</span>
                    <span className={styles.pickEquipment}>{ex.equipment}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Set logger ── */}
      {view === "log" && (
        <>
          <div className={styles.topBar}>
            <button className={styles.back} onClick={() => setView("session")}>
              ← Back
            </button>
            <span className={styles.sessionDate}>{selectedExercise.name}</span>
          </div>

          {lastSet && (
            <div className={styles.lastSet}>
              <span className={styles.lastSetLabel}>Last time</span>
              <span className={styles.lastSetValue}>{formatSet(lastSet)}</span>
              <span className={styles.lastSetDate}>
                {formatDate(lastSet.date)}
              </span>
            </div>
          )}

          <div className={styles.logForm}>
            {cardio ? (
              <>
                <div className={styles.logInputs}>
                  <div className={styles.logField}>
                    <label>Distance (km)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="0"
                      value={form.distance_km}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, distance_km: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.logField}>
                    <label>Time (mm:ss)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0:00"
                      value={form.time_str}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time_str: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className={styles.logField}>
                  <label>Notes</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : timed ? (
              <>
                <div className={styles.logInputs}>
                  <div className={styles.logField}>
                    <label>Time (mm:ss)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0:00"
                      value={form.time_str}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time_str: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.logField}>
                    <label>Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="1"
                      value={form.reps}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, reps: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className={styles.logInputs}>
                  <div className={styles.logField}>
                    <label>Rest (min)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="0"
                      value={form.rest_min}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rest_min: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.logField}>
                    <label>Notes</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <RPEInput
                  value={form.rpe}
                  onChange={(rpe) => setForm((f) => ({ ...f, rpe }))}
                />
              </>
            ) : (
              <>
                <div className={styles.logInputs}>
                  <div className={styles.logField}>
                    <label>Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={form.reps}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, reps: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.logField}>
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="0"
                      value={form.weight_kg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, weight_kg: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className={styles.logInputs}>
                  <div className={styles.logField}>
                    <label>Rest (min)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="0"
                      value={form.rest_min}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rest_min: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.logField}>
                    <label>Notes</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <RPEInput
                  value={form.rpe}
                  onChange={(rpe) => setForm((f) => ({ ...f, rpe }))}
                />
              </>
            )}

            {isPR && (
              <div className={styles.prAlert}>
                🏆 New PR! {isWeightPR && `Weight: ${form.weight_kg}kg`}{" "}
                {isRepsPR && `Reps: ${form.reps}`}
                {isDistancePR && `Distance: ${form.distance_km}km`}{" "}
                {isPacePR && `Pace: ${speedKmh}km/h`}
                {isDurationPR && `Time: ${form.time_str}`}
              </div>
            )}

            <div className={styles.logActions}>
              <button
                className={`${styles.logSet} ${isPR ? styles.logSetPR : ""}`}
                onClick={handleLogSet}
                disabled={
                  saving ||
                  (cardio
                    ? !form.distance_km || !form.time_str
                    : timed
                      ? !form.time_str
                      : !form.reps)
                }
              >
                {saving ? "Logging..." : isPR ? "🏆 Log PR" : "Log Set"}
              </button>
              <button
                className={styles.doneExercise}
                onClick={() => setView("session")}
              >
                Done with exercise
              </button>
            </div>

            {session.sets.filter((s) => s.exercise_id === selectedExercise.id)
              .length > 0 && (
              <div className={styles.currentSets}>
                <div className={styles.currentSetsLabel}>This session</div>
                <ul className={styles.setList}>
                  {session.sets
                    .filter((s) => s.exercise_id === selectedExercise.id)
                    .map((set) => (
                      <li key={set.id} className={styles.setRow}>
                        <span className={styles.setNum}>#{set.set_number}</span>
                        <span className={styles.setDetail}>
                          {formatSet(set)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function groupSetsByExercise(sets) {
  const map = {};
  for (const set of sets) {
    if (!map[set.exercise_id]) {
      map[set.exercise_id] = {
        exercise_id: set.exercise_id,
        exercise_name: set.exercise_name,
        sets: [],
      };
    }
    map[set.exercise_id].sets.push(set);
  }
  return Object.values(map);
}

function groupByCategory(exercises) {
  return exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {});
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
