import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession } from "../api/sessions";
import styles from "./SessionDetail.module.scss";

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSession(id)
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header className={styles.header}>
        <h1>{formatDate(session.date)}</h1>
        {session.programme && (
          <span className={styles.programme}>{session.programme}</span>
        )}
        {session.notes && <p className={styles.notes}>{session.notes}</p>}
      </header>

      <ul className={styles.sets}>
        {session.sets.map((set) => (
          <li key={set.id} className={styles.set}>
            <span className={styles.setNum}>#{set.set_number}</span>
            <span className={styles.exercise}>{set.exercise_name}</span>
            <span className={styles.detail}>{formatSet(set)}</span>
            {set.is_ladder ? (
              <span className={styles.ladder}>Ladder {set.ladder_step}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSet(set) {
  const parts = [];
  if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weight_kg) parts.push(`${set.weight_kg}kg`);
  if (set.weight_note) parts.push(set.weight_note);
  if (set.duration_min) parts.push(`${set.duration_min}min`);
  if (set.distance_m) parts.push(`${set.distance_m}m`);
  if (set.speed_kmh) parts.push(`${set.speed_kmh}km/h`);
  return parts.join(" · ") || "—";
}
