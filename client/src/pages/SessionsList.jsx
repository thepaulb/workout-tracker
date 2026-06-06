import { useState, useEffect } from "react";
import { getSessions } from "../api/sessions";
import { useNavigate } from "react-router-dom";
import styles from "./SessionsList.module.scss";

export default function SessionsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Sessions</h1>
        <span className={styles.count}>{sessions.length} total</span>
        <button
          className={styles.newSession}
          onClick={() => navigate("/sessions/new")}
        >
          + New
        </button>
      </header>

      <ul className={styles.list}>
        {sessions.map((session) => (
          <li
            key={session.id}
            className={styles.card}
            onClick={() => navigate(`/sessions/${session.id}`)}
          >
            <div className={styles.date}>{formatDate(session.date)}</div>
            <div className={styles.programme}>{session.programme ?? "—"}</div>
            <div className={styles.meta}>
              <span>{session.set_count} sets</span>
              {session.notes && (
                <span className={styles.notes}>{session.notes}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
