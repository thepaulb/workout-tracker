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
      COUNT(DISTINCT s.id)                         AS session_count,
      MAX(s.date)                                  AS last_session,
      SUM(st.reps * COALESCE(st.weight_kg, 0))     AS total_volume
    FROM exercises e
    JOIN sets st ON st.exercise_id = e.id
    JOIN sessions s ON s.id = st.session_id
    GROUP BY e.id
    ORDER BY total_volume DESC
  `,
    )
    .all();
  res.json(rows);
});

module.exports = router;
