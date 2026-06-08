import styles from "./PRBadge.module.scss";

export default function PRBadge({ type = "weight" }) {
  return (
    <span
      className={`${styles.badge} ${type === "reps" ? styles.reps : styles.weight}`}
    >
      PR
    </span>
  );
}
