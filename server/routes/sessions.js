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
    GROUP BY s.id
    ORDER BY s.date DESC
  `,
    )
    .all();

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
    WHERE s.id = ?
  `,
    )
    .get(req.params.id);

  if (!session) return res.status(404).json({ error: "Session not found" });

  session.sets = db
    .prepare(
      `
        SELECT st.*, e.name AS exercise_name, e.category, e.equipment,
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
    INSERT INTO sessions (date, programme_id, notes) VALUES (?, ?, ?)
  `,
    )
    .run(date, programme_id ?? null, notes ?? null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH update session
router.patch("/:id", (req, res) => {
  const { date, programme_id, notes } = req.body;

  const session = db
    .prepare("SELECT id FROM sessions WHERE id = ?")
    .get(req.params.id);
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
    .prepare("SELECT id FROM sessions WHERE id = ?")
    .get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
