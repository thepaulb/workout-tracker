const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all sessions with programme name and set count
router.get("/", (req, res) => {
  const sessions = db
    .prepare(
      `
    SELECT
      s.id,
      s.date,
      p.name AS programme,
      s.notes,
      COUNT(st.id) AS set_count
    FROM sessions s
    LEFT JOIN programmes p ON p.id = s.programme_id
    LEFT JOIN sets st ON st.session_id = s.id
    WHERE s.user_id = ?
    GROUP BY s.id
    ORDER BY s.date DESC
  `,
    )
    .all(req.user.id);

  res.json(sessions);
});

// GET single session with all sets and exercise names
router.get("/:id", (req, res) => {
  const session = db
    .prepare(
      `
    SELECT s.*, p.name AS programme
    FROM sessions s
    LEFT JOIN programmes p ON p.id = s.programme_id
    WHERE s.id = ? AND s.user_id = ?
  `,
    )
    .get(req.params.id, req.user.id);

  if (!session) return res.status(404).json({ error: "Session not found" });

  session.sets = db
    .prepare(
      `
        SELECT st.*, e.name AS exercise_name, e.category, e.equipment, e.progression_type,
        MIN(st.id) OVER (PARTITION BY st.exercise_id) AS exercise_first_id
        FROM sets st
        JOIN exercises e ON e.id = st.exercise_id
        WHERE st.session_id = ?
        ORDER BY exercise_first_id, st.set_number
      `,
    )
    .all(req.params.id);

  res.json(session);
});

// POST new session
router.post("/", (req, res) => {
  const { date, programme_id, notes } = req.body;

  if (!date) return res.status(400).json({ error: "date is required" });

  const result = db
    .prepare(
      `
    INSERT INTO sessions (user_id, date, programme_id, notes) VALUES (?, ?, ?, ?)
  `,
    )
    .run(req.user.id, date, programme_id ?? null, notes ?? null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// GET volume per week
router.get("/stats/volume", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT
      strftime('%Y-W%W', s.date)  AS week,
      MIN(s.date)                  AS week_start,
      SUM(st.reps * st.weight_kg)  AS volume_kg,
      COUNT(DISTINCT s.id)         AS sessions,
      COUNT(st.id)                 AS total_sets
    FROM sessions s
    JOIN sets st ON st.session_id = s.id
    WHERE s.user_id = ?
      AND st.weight_kg IS NOT NULL
      AND st.reps IS NOT NULL
    GROUP BY week
    ORDER BY week ASC
  `,
    )
    .all(req.user.id);
  res.json(rows);
});

// PATCH update session
router.patch("/:id", (req, res) => {
  const { date, programme_id, notes } = req.body;

  const session = db
    .prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  db.prepare(
    `
    UPDATE sessions SET
      date         = COALESCE(?, date),
      programme_id = COALESCE(?, programme_id),
      notes        = COALESCE(?, notes)
    WHERE id = ?
  `,
  ).run(date ?? null, programme_id ?? null, notes ?? null, req.params.id);

  res.json({ ok: true });
});

// DELETE session (cascades to sets)
router.delete("/:id", (req, res) => {
  const session = db
    .prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
