import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession } from "../api/sessions";
import { getExercises } from "../api/exercises";
import { createSet, deleteSet, getLastSet } from "../api/sets";
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
    notes: "",
  });

  useEffect(() => {
    Promise.all([getSession(id), getExercises()])
      .then(([s, e]) => {
        setSession(s);
        setExercises(e);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function selectExercise(exercise) {
    setSelected(exercise);
    const last = await getLastSet(exercise.id);
    setLastSet(last);
    setForm({
      reps: "",
      weight_kg: last?.weight_kg ?? "",
      rest_min: "",
      notes: "",
    });
    setView("log");
  }

  async function handleLogSet() {
    if (!form.reps) return;
    setSaving(true);
    try {
      const setsForExercise = session.sets.filter(
        (s) => s.exercise_id === selectedExercise.id,
      );
      await createSet({
        session_id: parseInt(id),
        exercise_id: selectedExercise.id,
        set_number: setsForExercise.length + 1,
        reps: parseInt(form.reps),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        rest_min: form.rest_min ? parseFloat(form.rest_min) : null,
        notes: form.notes || null,
        is_ladder: false,
      });
      const updated = await getSession(id);
      setSession(updated);
      setForm((f) => ({ ...f, reps: "", notes: "" }));
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

            <div className={styles.logActions}>
              <button
                className={styles.logSet}
                onClick={handleLogSet}
                disabled={saving || !form.reps}
              >
                {saving ? "Logging..." : "Log Set"}
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

function formatSet(set) {
  const parts = [];
  if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weight_kg) parts.push(`${set.weight_kg}kg`);
  if (set.weight_note) parts.push(set.weight_note);
  if (set.duration_min) parts.push(`${set.duration_min}min`);
  if (set.distance_m) parts.push(`${set.distance_m}m`);
  return parts.join(" · ") || "—";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
