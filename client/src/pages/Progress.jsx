import { useState, useEffect } from "react";
import { getPersonalBests, getVolume } from "../api/progress";
import VolumeChart from "../components/VolumeChart";
import PersonalBests from "../components/PersonalBests";

import styles from "./Progress.module.scss";

export default function Progress() {
  const [bests, setBests] = useState([]);
  const [volume, setVolume] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getPersonalBests(), getVolume()])
      .then(([b, v]) => {
        setBests(b);
        setVolume(v);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.state}>Loading...</div>;
  if (error) return <div className={styles.state}>Error: {error}</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Progress</h1>
      </header>

      <VolumeChart data={volume} />
      <PersonalBests bests={bests} />
    </div>
  );
}
