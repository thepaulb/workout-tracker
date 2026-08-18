import { useNavigate } from "react-router-dom";
import {
  isCardio,
  isTimed,
  formatDistanceKm,
  formatDaysAgo,
  bestE1RMFromSets,
  bestRepsFromSets,
  bestSpeedFromSets,
  bestDurationFromSets,
  minutesToClock,
} from "../lib/exerciseMetrics";
import styles from "./PersonalBests.module.scss";

export default function PersonalBests({ bests }) {
  const navigate = useNavigate();

  const cardio = bests.filter(isCardio);
  const timed = bests.filter((b) => !isCardio(b) && isTimed(b));
  const withWeight = bests.filter(
    (b) => !isCardio(b) && !isTimed(b) && b.best_weight,
  );
  const bodyweight = bests.filter(
    (b) => !isCardio(b) && !isTimed(b) && !b.best_weight && b.best_reps,
  );

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Personal Bests</h2>

      {withWeight.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Weighted</h3>
          <ul className={styles.list}>
            {withWeight.map((ex) => {
              // Falls back to current top-set reps when the most recent
              // day was bodyweight-only (e.g. Pull-up with no added
              // weight), same as the exercise detail page.
              const currentE1RM = bestE1RMFromSets(ex.recent_sets ?? []);
              const currentTopSetReps =
                currentE1RM == null
                  ? bestRepsFromSets(ex.recent_sets ?? [])
                  : null;

              return (
                <li
                  key={ex.id}
                  className={styles.row}
                  onClick={() => navigate(`/exercises/${ex.id}`)}
                >
                  <div className={styles.name}>{ex.name}</div>
                  <div className={styles.bests}>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {currentE1RM != null
                          ? `${currentE1RM}kg`
                          : (currentTopSetReps ?? "—")}
                      </span>
                      <span className={styles.bestLabel}>
                        {currentE1RM != null ? "current e1RM" : "current top set"}
                      </span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>{ex.best_weight}kg</span>
                      <span className={styles.bestLabel}>best weight</span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>{ex.best_reps}</span>
                      <span className={styles.bestLabel}>best reps</span>
                    </span>
                  </div>
                  <div className={styles.last}>
                    {formatDaysAgo(ex.last_session)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {timed.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Timed</h3>
          <ul className={styles.list}>
            {timed.map((ex) => {
              const currentHold = bestDurationFromSets(ex.recent_sets ?? []);

              return (
                <li
                  key={ex.id}
                  className={styles.row}
                  onClick={() => navigate(`/exercises/${ex.id}`)}
                >
                  <div className={styles.name}>{ex.name}</div>
                  <div className={styles.bests}>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {currentHold != null ? minutesToClock(currentHold) : "—"}
                      </span>
                      <span className={styles.bestLabel}>current hold</span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {ex.best_duration != null ? minutesToClock(ex.best_duration) : "—"}
                      </span>
                      <span className={styles.bestLabel}>best hold</span>
                    </span>
                  </div>
                  <div className={styles.last}>
                    {formatDaysAgo(ex.last_session)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {cardio.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Cardio</h3>
          <ul className={styles.list}>
            {cardio.map((ex) => {
              const currentPace = bestSpeedFromSets(ex.recent_sets ?? []);

              return (
                <li
                  key={ex.id}
                  className={styles.row}
                  onClick={() => navigate(`/exercises/${ex.id}`)}
                >
                  <div className={styles.name}>{ex.name}</div>
                  <div className={styles.bests}>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {currentPace != null ? `${currentPace}km/h` : "—"}
                      </span>
                      <span className={styles.bestLabel}>current pace</span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {formatDistanceKm(ex.best_distance)}
                      </span>
                      <span className={styles.bestLabel}>best distance</span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {ex.best_speed ? `${ex.best_speed}km/h` : "—"}
                      </span>
                      <span className={styles.bestLabel}>best pace</span>
                    </span>
                  </div>
                  <div className={styles.last}>
                    {formatDaysAgo(ex.last_session)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bodyweight.length > 0 && (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Bodyweight</h3>
          <ul className={styles.list}>
            {bodyweight.map((ex) => {
              const currentTopSetReps = bestRepsFromSets(ex.recent_sets ?? []);

              return (
                <li
                  key={ex.id}
                  className={styles.row}
                  onClick={() => navigate(`/exercises/${ex.id}`)}
                >
                  <div className={styles.name}>{ex.name}</div>
                  <div className={styles.bests}>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>
                        {currentTopSetReps ?? "—"}
                      </span>
                      <span className={styles.bestLabel}>current top set</span>
                    </span>
                    <span className={styles.best}>
                      <span className={styles.bestValue}>{ex.best_reps}</span>
                      <span className={styles.bestLabel}>best reps</span>
                    </span>
                  </div>
                  <div className={styles.last}>
                    {formatDaysAgo(ex.last_session)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
