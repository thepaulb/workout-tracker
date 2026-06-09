const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAuth = require("../middleware/auth");

// GET all goals with exercise name and current progress
router.get("/", (req, res) => {
  const goals = db
    .prepare(
      `
    SELECT
      g.*,
      e.name        AS exercise_name,
      e.category    AS exercise_category,
      MAX(CASE WHEN g.target_type = 'weight' THEN st.weight_kg
               WHEN g.target_type = 'reps'   THEN st.reps
          END)      AS current_value
    FROM goals g
    JOIN exercises e ON e.id = g.exercise_id
    LEFT JOIN sets st ON st.exercise_id = g.exercise_id
    GROUP BY g.id
    ORDER BY g.completed_at ASC, g.deadline ASC, g.created_at DESC
  `,
    )
    .all();

  res.json(goals);
});

// POST new goal
router.post("/", requireAuth, (req, res) => {
  const { exercise_id, target_type, target_value, deadline } = req.body;

  if (!exercise_id || !target_type || !target_value) {
    return res
      .status(400)
      .json({
        error: "exercise_id, target_type and target_value are required",
      });
  }

  // Check if already completed on creation
  const current = db
    .prepare(
      `
    SELECT MAX(CASE WHEN ? = 'weight' THEN weight_kg ELSE reps END) AS val
    FROM sets WHERE exercise_id = ?
  `,
    )
    .get(target_type, exercise_id);

  const completed_at =
    current?.val >= target_value ? new Date().toISOString() : null;

  const result = db
    .prepare(
      `
    INSERT INTO goals (exercise_id, target_type, target_value, deadline, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      exercise_id,
      target_type,
      target_value,
      deadline ?? null,
      completed_at,
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

// POST check and update goal completion (called after logging a set)
router.post("/check", requireAuth, (req, res) => {
  const { exercise_id } = req.body;
  if (!exercise_id)
    return res.status(400).json({ error: "exercise_id required" });

  const goals = db
    .prepare(
      `
    SELECT * FROM goals
    WHERE exercise_id = ? AND completed_at IS NULL
  `,
    )
    .all(exercise_id);

  const updated = [];

  for (const goal of goals) {
    const current = db
      .prepare(
        `
      SELECT MAX(CASE WHEN ? = 'weight' THEN weight_kg ELSE reps END) AS val
      FROM sets WHERE exercise_id = ?
    `,
      )
      .get(goal.target_type, exercise_id);

    if (current?.val >= goal.target_value) {
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
router.delete("/:id", requireAuth, (req, res) => {
  const goal = db
    .prepare("SELECT id FROM goals WHERE id = ?")
    .get(req.params.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
