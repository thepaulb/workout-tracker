import styles from "./PRBadge.module.scss";

export default function PRBadge({ type = "weight" }) {
  return (
    <span className={`${styles.badge} ${styles[type] ?? styles.weight}`}>
      PR
    </span>
  );
}
