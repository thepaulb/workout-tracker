import { useState, useEffect } from "react";
import { getBodyComposition, addEntry, deleteEntry } from "../api/body";
import BodyChart from "../components/BodyChart";
import styles from "./Body.module.scss";

export default function Body() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    bodyweight_kg: "",
    body_fat_pct: "",
  });

  useEffect(() => {
    getBodyComposition()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!form.date || !form.bodyweight_kg) return;
    setSaving(true);
    try {
      await addEntry({
        date: form.date,
        bodyweight_kg: parseFloat(form.bodyweight_kg),
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      });
      const updated = await getBodyComposition();
      setEntries(updated);
      setForm({ date: today(), bodyweight_kg: "", body_fat_pct: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  const latest = entries[entries.length - 1];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Body Composition</h1>
        {latest && (
          <div className={styles.latest}>
            <span className={styles.latestValue}>{latest.bodyweight_kg}kg</span>
            {latest.body_fat_pct && (
              <span className={styles.latestFat}>
                {latest.body_fat_pct}% bf
              </span>
            )}
            <span className={styles.latestDate}>{formatDate(latest.date)}</span>
          </div>
        )}
      </header>

      <BodyChart data={entries} />

      <div className={styles.form}>
        <h2 className={styles.formTitle}>Log Entry</h2>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Bodyweight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="80.0"
              value={form.bodyweight_kg}
              onChange={(e) =>
                setForm((f) => ({ ...f, bodyweight_kg: e.target.value }))
              }
            />
          </div>
          <div className={styles.field}>
            <label>
              Body Fat % <span>(optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="15.0"
              value={form.body_fat_pct}
              onChange={(e) =>
                setForm((f) => ({ ...f, body_fat_pct: e.target.value }))
              }
            />
          </div>
          <button
            className={styles.submit}
            onClick={handleSubmit}
            disabled={saving || !form.bodyweight_kg}
          >
            {saving ? "Saving..." : "Log"}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className={styles.history}>
          <h2 className={styles.formTitle}>History</h2>
          <ul className={styles.list}>
            {[...entries].reverse().map((entry) => (
              <li key={entry.id} className={styles.row}>
                <span className={styles.date}>{formatDate(entry.date)}</span>
                <span className={styles.weight}>{entry.bodyweight_kg}kg</span>
                <span className={styles.fat}>
                  {entry.body_fat_pct ? `${entry.body_fat_pct}%` : "—"}
                </span>
                <button
                  className={styles.delete}
                  onClick={() => handleDelete(entry.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
