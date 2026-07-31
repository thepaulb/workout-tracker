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
      MAX(st.weight_kg)                            AS best_weight,
      MAX(st.reps)                                 AS best_reps,
      MAX(st.distance_m)                           AS best_distance,
      MAX(st.speed_kmh)                            AS best_speed,
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
  res.json(rows);
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
      MAX(st.speed_kmh)   AS best_speed
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
    };
  }

  res.json(map);
});

module.exports = router;
