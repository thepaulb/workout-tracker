import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProgrammes } from "../api/programmes";
import { createSession } from "../api/sessions";
import styles from "./NewSession.module.scss";

export default function NewSession() {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    date: today(),
    programme_id: "",
    notes: "",
  });

  useEffect(() => {
    getProgrammes().then(setProgrammes);
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const result = await createSession({
        date: form.date,
        programme_id: form.programme_id || null,
        notes: form.notes || null,
      });
      navigate(`/sessions/${result.id}/log`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header className={styles.header}>
        <h1>New Session</h1>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.form}>
        <div className={styles.field}>
          <label>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>

        <div className={styles.field}>
          <label>
            Programme <span>(optional)</span>
          </label>
          <select
            value={form.programme_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, programme_id: e.target.value }))
            }
          >
            <option value="">— No programme —</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>
            Notes <span>(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Any notes about this session..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={saving || !form.date}
        >
          {saving ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}
