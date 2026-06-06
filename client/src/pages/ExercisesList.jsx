import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getExercises } from "../api/exercises";

import styles from "./ExercisesList.module.scss";

export default function ExercisesList() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getExercises()
      .then(setExercises)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  const grouped = groupByCategory(exercises);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Exercises</h1>
        <span className={styles.count}>{exercises.length} total</span>
      </header>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className={styles.group}>
          <h2 className={styles.category}>{category}</h2>
          <ul className={styles.list}>
            {items.map((ex) => (
              <li
                key={ex.id}
                className={styles.card}
                onClick={() => navigate(`/exercises/${ex.id}`)}
              >
                <span className={styles.name}>{ex.name}</span>
                <span className={styles.equipment}>{ex.equipment}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupByCategory(exercises) {
  return exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {});
}
