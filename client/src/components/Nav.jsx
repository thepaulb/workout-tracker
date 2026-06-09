import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./Nav.module.scss";

const icons = {
  sessions: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  exercises: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 12h12" />
    </svg>
  ),
  progress: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  goals: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  body: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

const tabs = [
  { to: "/", label: "Sessions", icon: icons.sessions, end: true },
  { to: "/exercises", label: "Exercises", icon: icons.exercises },
  { to: "/progress", label: "Progress", icon: icons.progress },
  { to: "/goals", label: "Goals", icon: icons.goals },
  { to: "/body", label: "Body", icon: icons.body },
];

export default function Nav() {
  const { logout } = useAuth();

  return (
    <>
      {/* Desktop top nav */}
      <nav className={styles.topNav}>
        <div className={styles.logo}>GYM</div>
        <ul className={styles.links}>
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => (isActive ? styles.active : "")}
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button className={styles.logout} onClick={logout}>
          Sign out
        </button>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className={styles.bottomNav}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
