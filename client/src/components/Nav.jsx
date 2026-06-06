import { NavLink } from "react-router-dom";
import styles from "./Nav.module.scss";

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>GYM</div>
      <ul className={styles.links}>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Sessions
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/exercises"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Exercises
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/progress"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Progress
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/body"
            className={({ isActive }) => (isActive ? styles.active : "")}
          >
            Body
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
