const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all exercises
router.get("/", (req, res) => {
  const exercises = db
    .prepare(
      `
    SELECT * FROM exercises ORDER BY category, name
  `,
    )
    .all();
  res.json(exercises);
});

// GET single exercise with the current user's set history
router.get("/:id", (req, res) => {
  const exercise = db
    .prepare("SELECT * FROM exercises WHERE id = ?")
    .get(req.params.id);
  if (!exercise) return res.status(404).json({ error: "Exercise not found" });

  exercise.related_exercise = exercise.related_exercise_id
    ? db
        .prepare("SELECT id, name FROM exercises WHERE id = ?")
        .get(exercise.related_exercise_id)
    : null;

  exercise.history = db
    .prepare(
      `
    SELECT st.*, s.date, s.id AS session_id, e.progression_type
    FROM sets st
    JOIN sessions s ON s.id = st.session_id
    JOIN exercises e ON e.id = st.exercise_id
    WHERE st.exercise_id = ? AND s.user_id = ?
    ORDER BY s.date DESC
  `,
    )
    .all(req.params.id, req.user.id);

  res.json(exercise);
});

// POST new exercise
router.post("/", (req, res) => {
  const { name, category, equipment, notes, progression_type, related_exercise_id } =
    req.body;
  if (!name || !category || !equipment) {
    return res
      .status(400)
      .json({ error: "name, category and equipment are required" });
  }

  const result = db
    .prepare(
      `
    INSERT INTO exercises (name, category, equipment, notes, progression_type, related_exercise_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      name,
      category,
      equipment,
      notes ?? null,
      progression_type ?? "reps",
      related_exercise_id ?? null,
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH update exercise
router.patch("/:id", (req, res) => {
  const exercise = db
    .prepare("SELECT id FROM exercises WHERE id = ?")
    .get(req.params.id);
  if (!exercise) return res.status(404).json({ error: "Exercise not found" });

  const {
    name,
    category,
    equipment,
    notes,
    progression_type,
    related_exercise_id,
  } = req.body;
  db.prepare(
    `
    UPDATE exercises SET
      name                 = COALESCE(?, name),
      category             = COALESCE(?, category),
      equipment            = COALESCE(?, equipment),
      notes                = COALESCE(?, notes),
      progression_type     = COALESCE(?, progression_type),
      related_exercise_id  = COALESCE(?, related_exercise_id)
    WHERE id = ?
  `,
  ).run(
    name ?? null,
    category ?? null,
    equipment ?? null,
    notes ?? null,
    progression_type ?? null,
    related_exercise_id ?? null,
    req.params.id,
  );

  res.json({ ok: true });
});

module.exports = router;
