const express = require("express");
const router = express.Router();
const db = require("../db");

// Current best value for an exercise, counting only the given user's sets.
// distance goals are compared in km, pace goals in km/h.
function currentValue(targetType, exerciseId, userId) {
  const row = db
    .prepare(
      `
    SELECT MAX(
      CASE ?
        WHEN 'weight'   THEN weight_kg
        WHEN 'reps'     THEN reps
        WHEN 'distance' THEN distance_m / 1000.0
        WHEN 'pace'     THEN speed_kmh
      END
    ) AS val
    FROM sets
    WHERE exercise_id = ?
      AND session_id IN (SELECT id FROM sessions WHERE user_id = ?)
  `,
    )
    .get(targetType, exerciseId, userId);
  return row?.val ?? null;
}

// GET all goals with exercise name and current progress
router.get("/", (req, res) => {
  const goals = db
    .prepare(
      `
    SELECT
      g.*,
      e.name        AS exercise_name,
      e.category    AS exercise_category,
      MAX(CASE WHEN g.target_type = 'weight'   THEN st.weight_kg
               WHEN g.target_type = 'reps'     THEN st.reps
               WHEN g.target_type = 'distance' THEN st.distance_m / 1000.0
               WHEN g.target_type = 'pace'     THEN st.speed_kmh
          END)      AS current_value
    FROM goals g
    JOIN exercises e ON e.id = g.exercise_id
    LEFT JOIN sets st
      ON st.exercise_id = g.exercise_id
      AND st.session_id IN (SELECT id FROM sessions WHERE user_id = g.user_id)
    WHERE g.user_id = ?
    GROUP BY g.id
    ORDER BY g.completed_at ASC, g.deadline ASC, g.created_at DESC
  `,
    )
    .all(req.user.id);

  res.json(goals);
});

// POST new goal
router.post("/", (req, res) => {
  const { exercise_id, target_type, target_value, deadline } = req.body;

  if (!exercise_id || !target_type || !target_value) {
    return res.status(400).json({
      error: "exercise_id, target_type and target_value are required",
    });
  }

  // Check if already completed on creation
  const val = currentValue(target_type, exercise_id, req.user.id);
  const completed_at = val >= target_value ? new Date().toISOString() : null;

  const result = db
    .prepare(
      `
    INSERT INTO goals (user_id, exercise_id, target_type, target_value, deadline, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      req.user.id,
      exercise_id,
      target_type,
      target_value,
      deadline ?? null,
      completed_at,
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

// POST check and update goal completion (called after logging a set)
router.post("/check", (req, res) => {
  const { exercise_id } = req.body;
  if (!exercise_id)
    return res.status(400).json({ error: "exercise_id required" });

  const goals = db
    .prepare(
      `
    SELECT * FROM goals
    WHERE exercise_id = ? AND completed_at IS NULL AND user_id = ?
  `,
    )
    .all(exercise_id, req.user.id);

  const updated = [];

  for (const goal of goals) {
    const val = currentValue(goal.target_type, exercise_id, req.user.id);

    if (val >= goal.target_value) {
      db.prepare(`UPDATE goals SET completed_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        goal.id,
      );
      updated.push(goal.id);
    }
  }

  res.json({ completed: updated });
});

// DELETE goal
router.delete("/:id", (req, res) => {
  const goal = db
    .prepare("SELECT id FROM goals WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
