import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession } from "../api/sessions";
import { getPRs } from "../api/progress";
import PRBadge from "../components/PRBadge";
import { formatSet } from "../lib/exerciseMetrics";
import styles from "./SessionDetail.module.scss";

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [prs, setPRs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getSession(id), getPRs()])
      .then(([s, p]) => {
        setSession(s);
        setPRs(p);
      })
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
        {session.sets.map((set) => {
          const pr = prs[set.exercise_id];
          const isWeightPR =
            pr && set.weight_kg && set.weight_kg >= pr.best_weight;
          const isRepsPR = pr && set.reps && set.reps >= pr.best_reps;
          const isDistancePR =
            pr && set.distance_m && set.distance_m >= pr.best_distance;
          const isPacePR =
            pr && set.speed_kmh && set.speed_kmh >= pr.best_speed;
          const isPR = isWeightPR || isRepsPR || isDistancePR || isPacePR;

          return (
            <li
              key={set.id}
              className={`${styles.set} ${isPR ? styles.prSet : ""}`}
            >
              <span className={styles.setNum}>#{set.set_number}</span>
              <span className={styles.exercise}>
                {set.exercise_name}
                {Boolean(isWeightPR) && <PRBadge type="weight" />}
                {Boolean(isRepsPR) && <PRBadge type="reps" />}
                {Boolean(isDistancePR) && <PRBadge type="distance" />}
                {Boolean(isPacePR) && <PRBadge type="pace" />}
              </span>
              <span className={styles.detail}>{formatSet(set)}</span>
              {set.is_ladder ? (
                <span className={styles.ladder}>Ladder {set.ladder_step}</span>
              ) : null}
            </li>
          );
        })}
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
