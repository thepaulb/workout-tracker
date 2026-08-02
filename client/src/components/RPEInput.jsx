import styles from "./RPEInput.module.scss";

const MIN = 6;
const MAX = 10;
const STEP = 0.5;

// Optional RPE stepper: blank/unset by default, 6-10 in 0.5 increments.
// Decrementing below MIN clears back to unset rather than going lower.
export default function RPEInput({ value, onChange }) {
  function decrement() {
    if (value == null) return;
    onChange(value - STEP < MIN ? null : round(value - STEP));
  }

  function increment() {
    onChange(value == null ? MIN : round(Math.min(MAX, value + STEP)));
  }

  return (
    <div className={styles.field}>
      <label>RPE</label>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={decrement}
          disabled={value == null}
          aria-label="Decrease RPE"
        >
          −
        </button>
        <span className={styles.value}>{value == null ? "—" : value}</span>
        <button
          type="button"
          className={styles.stepButton}
          onClick={increment}
          disabled={value === MAX}
          aria-label="Increase RPE"
        >
          +
        </button>
      </div>
    </div>
  );
}

function round(n) {
  return Math.round(n * 10) / 10;
}
