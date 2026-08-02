const express = require("express");
const router = express.Router();
const db = require("../db");

// Returns the session row only if it belongs to the given user.
function ownedSession(sessionId, userId) {
  return db
    .prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?")
    .get(sessionId, userId);
}

// RPE must be null/absent, or a number 6-10 in 0.5 increments.
function isValidRpe(rpe) {
  if (rpe === null || rpe === undefined) return true;
  if (typeof rpe !== "number" || Number.isNaN(rpe)) return false;
  if (rpe < 6 || rpe > 10) return false;
  return Number.isInteger(rpe * 2);
}

// GET all sets for a session (usually accessed via /api/sessions/:id but useful standalone)
router.get("/session/:sessionId", (req, res) => {
  if (!ownedSession(req.params.sessionId, req.user.id)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const sets = db
    .prepare(
      `
    SELECT st.*, e.name AS exercise_name, e.category
    FROM sets st
    JOIN exercises e ON e.id = st.exercise_id
    WHERE st.session_id = ?
    ORDER BY st.set_number
  `,
    )
    .all(req.params.sessionId);

  res.json(sets);
});

// POST new set
router.post("/", (req, res) => {
  const {
    session_id,
    exercise_id,
    set_number,
    reps,
    weight_kg,
    weight_note,
    duration_min,
    distance_m,
    speed_kmh,
    rest_min,
    is_ladder,
    ladder_step,
    notes,
    rpe,
  } = req.body;

  if (!session_id || !exercise_id || !set_number) {
    return res
      .status(400)
      .json({ error: "session_id, exercise_id and set_number are required" });
  }

  if (!isValidRpe(rpe ?? null)) {
    return res
      .status(400)
      .json({ error: "rpe must be null or a number 6-10 in 0.5 increments" });
  }

  if (!ownedSession(session_id, req.user.id)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const result = db
    .prepare(
      `
    INSERT INTO sets (
      session_id, exercise_id, set_number,
      reps, weight_kg, weight_note,
      duration_min, distance_m, speed_kmh, rest_min,
      is_ladder, ladder_step, notes, rpe
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,
    )
    .run(
      session_id,
      exercise_id,
      set_number,
      reps ?? null,
      weight_kg ?? null,
      weight_note ?? null,
      duration_min ?? null,
      distance_m ?? null,
      speed_kmh ?? null,
      rest_min ?? null,
      is_ladder ? 1 : 0,
      ladder_step ?? null,
      notes ?? null,
      rpe ?? null,
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH update set
router.patch("/:id", (req, res) => {
  const set = db
    .prepare(
      `
      SELECT st.id
      FROM sets st
      JOIN sessions s ON s.id = st.session_id
      WHERE st.id = ? AND s.user_id = ?
    `,
    )
    .get(req.params.id, req.user.id);
  if (!set) return res.status(404).json({ error: "Set not found" });

  const {
    reps,
    weight_kg,
    weight_note,
    duration_min,
    distance_m,
    speed_kmh,
    rest_min,
    is_ladder,
    ladder_step,
    notes,
    rpe,
  } = req.body;

  if (!isValidRpe(rpe ?? null)) {
    return res
      .status(400)
      .json({ error: "rpe must be null or a number 6-10 in 0.5 increments" });
  }

  db.prepare(
    `
    UPDATE sets SET
      reps         = COALESCE(?, reps),
      weight_kg    = COALESCE(?, weight_kg),
      weight_note  = COALESCE(?, weight_note),
      duration_min = COALESCE(?, duration_min),
      distance_m   = COALESCE(?, distance_m),
      speed_kmh    = COALESCE(?, speed_kmh),
      rest_min     = COALESCE(?, rest_min),
      is_ladder    = COALESCE(?, is_ladder),
      ladder_step  = COALESCE(?, ladder_step),
      notes        = COALESCE(?, notes),
      rpe          = COALESCE(?, rpe)
    WHERE id = ?
  `,
  ).run(
    reps ?? null,
    weight_kg ?? null,
    weight_note ?? null,
    duration_min ?? null,
    distance_m ?? null,
    speed_kmh ?? null,
    rest_min ?? null,
    is_ladder !== undefined ? (is_ladder ? 1 : 0) : null,
    ladder_step ?? null,
    notes ?? null,
    rpe ?? null,
    req.params.id,
  );

  res.json({ ok: true });
});

// DELETE set
router.delete("/:id", (req, res) => {
  const set = db
    .prepare(
      `
      SELECT st.id
      FROM sets st
      JOIN sessions s ON s.id = st.session_id
      WHERE st.id = ? AND s.user_id = ?
    `,
    )
    .get(req.params.id, req.user.id);
  if (!set) return res.status(404).json({ error: "Set not found" });

  db.prepare("DELETE FROM sets WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET last set for an exercise (for context when logging)
router.get("/last/:exerciseId", (req, res) => {
  const row = db
    .prepare(
      `
    SELECT st.*, s.date
    FROM sets st
    JOIN sessions s ON s.id = st.session_id
    WHERE st.exercise_id = ? AND s.user_id = ?
    ORDER BY s.date DESC, st.set_number DESC
    LIMIT 1
  `,
    )
    .get(req.params.exerciseId, req.user.id);

  res.json(row ?? null);
});

module.exports = router;
