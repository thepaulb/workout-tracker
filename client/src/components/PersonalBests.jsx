import { useNavigate } from "react-router-dom";
import styles from "./PersonalBests.module.scss";

export default function PersonalBests({ bests }) {
  const navigate = useNavigate();

  const withWeight = bests.filter((b) => b.best_weight);
  const bodyweight = bests.filter((b) => !b.best_weight && b.best_reps);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Personal Bests</h2>

      {withWeight.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Weighted</h3>
          <ul className={styles.list}>
            {withWeight.map((ex) => (
              <li
                key={ex.id}
                className={styles.row}
                onClick={() => navigate(`/exercises/${ex.id}`)}
              >
                <div className={styles.name}>{ex.name}</div>
                <div className={styles.bests}>
                  <span className={styles.best}>
                    <span className={styles.bestValue}>{ex.best_weight}kg</span>
                    <span className={styles.bestLabel}>best weight</span>
                  </span>
                  <span className={styles.best}>
                    <span className={styles.bestValue}>{ex.best_reps}</span>
                    <span className={styles.bestLabel}>best reps</span>
                  </span>
                  <span className={styles.best}>
                    <span className={styles.bestValue}>{ex.session_count}</span>
                    <span className={styles.bestLabel}>sessions</span>
                  </span>
                </div>
                <div className={styles.last}>{formatDate(ex.last_session)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bodyweight.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Bodyweight</h3>
          <ul className={styles.list}>
            {bodyweight.map((ex) => (
              <li
                key={ex.id}
                className={styles.row}
                onClick={() => navigate(`/exercises/${ex.id}`)}
              >
                <div className={styles.name}>{ex.name}</div>
                <div className={styles.bests}>
                  <span className={styles.best}>
                    <span className={styles.bestValue}>{ex.best_reps}</span>
                    <span className={styles.bestLabel}>best reps</span>
                  </span>
                  <span className={styles.best}>
                    <span className={styles.bestValue}>{ex.session_count}</span>
                    <span className={styles.bestLabel}>sessions</span>
                  </span>
                </div>
                <div className={styles.last}>{formatDate(ex.last_session)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
