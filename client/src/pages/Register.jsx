import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Login.module.scss";

export default function Register() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });

  async function handleSubmit() {
    if (!form.username || !form.password) return;
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not create user. Please try again.");
      }
      setSuccess(`User "${form.username}" created`);
      setForm({ username: "", password: "", confirm: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>GYM</div>
        <h1 className={styles.title}>Create user</h1>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.fields}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.field}>
            <label>Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirm: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={
            loading || !form.username || !form.password || !form.confirm
          }
        >
          {loading ? "Creating user..." : "Create user"}
        </button>

        <div className={styles.switchLink}>
          <Link to="/">Back to app</Link>
        </div>
      </div>
    </div>
  );
}
