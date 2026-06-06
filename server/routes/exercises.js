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

// GET single exercise with all sets history
router.get("/:id", (req, res) => {
  const exercise = db
    .prepare("SELECT * FROM exercises WHERE id = ?")
    .get(req.params.id);
  if (!exercise) return res.status(404).json({ error: "Exercise not found" });

  exercise.history = db
    .prepare(
      `
    SELECT st.*, s.date, s.id AS session_id
    FROM sets st
    JOIN sessions s ON s.id = st.session_id
    WHERE st.exercise_id = ?
    ORDER BY s.date DESC
  `,
    )
    .all(req.params.id);

  res.json(exercise);
});

// POST new exercise
router.post("/", (req, res) => {
  const { name, category, equipment, notes } = req.body;
  if (!name || !category || !equipment) {
    return res
      .status(400)
      .json({ error: "name, category and equipment are required" });
  }

  const result = db
    .prepare(
      `
    INSERT INTO exercises (name, category, equipment, notes) VALUES (?, ?, ?, ?)
  `,
    )
    .run(name, category, equipment, notes ?? null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH update exercise
router.patch("/:id", (req, res) => {
  const exercise = db
    .prepare("SELECT id FROM exercises WHERE id = ?")
    .get(req.params.id);
  if (!exercise) return res.status(404).json({ error: "Exercise not found" });

  const { name, category, equipment, notes } = req.body;
  db.prepare(
    `
    UPDATE exercises SET
      name      = COALESCE(?, name),
      category  = COALESCE(?, category),
      equipment = COALESCE(?, equipment),
      notes     = COALESCE(?, notes)
    WHERE id = ?
  `,
  ).run(
    name ?? null,
    category ?? null,
    equipment ?? null,
    notes ?? null,
    req.params.id,
  );

  res.json({ ok: true });
});

module.exports = router;
