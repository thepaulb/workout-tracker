import { useState, useEffect } from "react";
import { getGoals, createGoal, deleteGoal } from "../api/goals";
import { getExercises } from "../api/exercises";
import styles from "./Goals.module.scss";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    exercise_id: "",
    target_type: "weight",
    target_value: "",
    deadline: "",
  });

  useEffect(() => {
    Promise.all([getGoals(), getExercises()])
      .then(([g, e]) => {
        setGoals(g);
        setExercises(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!form.exercise_id || !form.target_value) return;
    setSaving(true);
    try {
      await createGoal({
        exercise_id: parseInt(form.exercise_id),
        target_type: form.target_type,
        target_value: parseFloat(form.target_value),
        deadline: form.deadline || null,
      });
      const updated = await getGoals();
      setGoals(updated);
      setForm({
        exercise_id: "",
        target_type: "weight",
        target_value: "",
        deadline: "",
      });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  const active = goals.filter((g) => !g.completed_at);
  const completed = goals.filter((g) => g.completed_at);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Goals</h1>
        <button
          className={styles.newGoal}
          onClick={() => setShowForm((f) => !f)}
        >
          {showForm ? "Cancel" : "+ New Goal"}
        </button>
      </header>

      {showForm && (
        <div className={styles.form}>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label>Exercise</label>
              <select
                value={form.exercise_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, exercise_id: e.target.value }))
                }
              >
                <option value="">— Select exercise —</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Target</label>
              <div className={styles.targetRow}>
                <select
                  value={form.target_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_type: e.target.value }))
                  }
                  className={styles.targetType}
                >
                  <option value="weight">Weight (kg)</option>
                  <option value="reps">Reps</option>
                </select>
                <input
                  type="number"
                  step="0.5"
                  placeholder={form.target_type === "weight" ? "100" : "20"}
                  value={form.target_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_value: e.target.value }))
                  }
                  className={styles.targetValue}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>
                Deadline <span>(optional)</span>
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deadline: e.target.value }))
                }
              />
            </div>
          </div>

          <button
            className={styles.submit}
            onClick={handleSubmit}
            disabled={saving || !form.exercise_id || !form.target_value}
          >
            {saving ? "Saving..." : "Create Goal"}
          </button>
        </div>
      )}

      {active.length === 0 && !showForm && (
        <div className={styles.empty}>
          No active goals — set one to get started
        </div>
      )}

      {active.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Active</h2>
          <ul className={styles.list}>
            {active.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Completed</h2>
          <ul className={styles.list}>
            {completed.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDelete}
                completed
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GoalCard({ goal, onDelete, completed }) {
  const progress = Math.min(
    (goal.current_value / goal.target_value) * 100,
    100,
  );
  const isOverdue =
    goal.deadline && !completed && new Date(goal.deadline) < new Date();

  return (
    <li className={`${styles.card} ${completed ? styles.completedCard : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className={styles.exerciseName}>{goal.exercise_name}</span>
          {completed && (
            <span className={styles.completedBadge}>✓ Completed</span>
          )}
          {isOverdue && <span className={styles.overdueBadge}>Overdue</span>}
        </div>
        <button className={styles.delete} onClick={() => onDelete(goal.id)}>
          ×
        </button>
      </div>

      <div className={styles.target}>
        <span className={styles.currentValue}>{goal.current_value ?? 0}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.targetValue}>
          {goal.target_value}
          {goal.target_type === "weight" ? "kg" : " reps"}
        </span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${completed ? styles.progressComplete : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.progressPct}>{Math.round(progress)}%</span>
        {goal.deadline && (
          <span
            className={`${styles.deadline} ${isOverdue ? styles.deadlineOverdue : ""}`}
          >
            {completed
              ? `Achieved ${formatDate(goal.completed_at)}`
              : `Due ${formatDate(goal.deadline)}`}
          </span>
        )}
        {completed && !goal.deadline && (
          <span className={styles.deadline}>
            Achieved {formatDate(goal.completed_at)}
          </span>
        )}
      </div>
    </li>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
