const express = require("express");
const router = express.Router();
const db = require("../db");

// GET personal bests per exercise
router.get("/bests", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT
      e.id,
      e.name,
      e.category,
      e.equipment,
      e.progression_type,
      MAX(st.weight_kg)                            AS best_weight,
      MAX(st.reps)                                 AS best_reps,
      MAX(st.distance_m)                           AS best_distance,
      MAX(st.speed_kmh)                            AS best_speed,
      MAX(st.duration_min)                         AS best_duration,
      COUNT(DISTINCT s.id)                         AS session_count,
      MAX(s.date)                                  AS last_session,
      SUM(st.reps * COALESCE(st.weight_kg, 0))     AS total_volume
    FROM exercises e
    JOIN sets st ON st.exercise_id = e.id
    JOIN sessions s ON s.id = st.session_id
    WHERE s.user_id = ?
    GROUP BY e.id
    ORDER BY total_volume DESC
  `,
    )
    .all(req.user.id);

  // Raw sets from each exercise's most recent session date, so the client
  // can compute "current" stats (e1RM etc) using the same shared logic
  // that already exists there, rather than duplicating the e1RM formula
  // in SQL. RANK (not ROW_NUMBER) so a multi-session day keeps all its sets.
  const recentSets = db
    .prepare(
      `
    SELECT exercise_id, weight_kg, reps, rpe, speed_kmh, duration_min
    FROM (
      SELECT st.exercise_id, st.weight_kg, st.reps, st.rpe, st.speed_kmh, st.duration_min,
        RANK() OVER (PARTITION BY st.exercise_id ORDER BY s.date DESC) AS rnk
      FROM sets st
      JOIN sessions s ON s.id = st.session_id
      WHERE s.user_id = ?
    )
    WHERE rnk = 1
  `,
    )
    .all(req.user.id);

  const recentSetsByExercise = {};
  for (const s of recentSets) {
    if (!recentSetsByExercise[s.exercise_id]) recentSetsByExercise[s.exercise_id] = [];
    recentSetsByExercise[s.exercise_id].push({
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
      speed_kmh: s.speed_kmh,
      duration_min: s.duration_min,
    });
  }

  res.json(
    rows.map((r) => ({
      ...r,
      recent_sets: recentSetsByExercise[r.id] ?? [],
    })),
  );
});

// GET PR lookup map — { exerciseId: { best_weight, best_reps } }
router.get("/prs", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT
      e.id,
      MAX(st.weight_kg)   AS best_weight,
      MAX(st.reps)        AS best_reps,
      MAX(st.distance_m)  AS best_distance,
      MAX(st.speed_kmh)   AS best_speed,
      MAX(st.duration_min) AS best_duration
    FROM exercises e
    JOIN sets st ON st.exercise_id = e.id
    JOIN sessions s ON s.id = st.session_id
    WHERE s.user_id = ?
    GROUP BY e.id
  `,
    )
    .all(req.user.id);

  const map = {};
  for (const row of rows) {
    map[row.id] = {
      best_weight: row.best_weight,
      best_reps: row.best_reps,
      best_distance: row.best_distance,
      best_speed: row.best_speed,
      best_duration: row.best_duration,
    };
  }

  res.json(map);
});

module.exports = router;
