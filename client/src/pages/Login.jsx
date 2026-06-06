import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./Login.module.scss";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit() {
    if (!form.username || !form.password) return;
    setLoading(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch {
      setError("Invalid username or password");
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
        <h1 className={styles.title}>Sign in</h1>

        {error && <div className={styles.error}>{error}</div>}

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
              autoComplete="current-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={loading || !form.username || !form.password}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}
