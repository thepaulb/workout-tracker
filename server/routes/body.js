const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all entries
router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT * FROM body_composition WHERE user_id = ? ORDER BY date ASC
  `,
    )
    .all(req.user.id);
  res.json(rows);
});

// POST new entry
router.post("/", (req, res) => {
  const { date, bodyweight_kg, body_fat_pct } = req.body;

  if (!date || !bodyweight_kg) {
    return res
      .status(400)
      .json({ error: "date and bodyweight_kg are required" });
  }

  // Upsert — if this user already has an entry for that date, update it
  const existing = db
    .prepare("SELECT id FROM body_composition WHERE user_id = ? AND date = ?")
    .get(req.user.id, date);

  if (existing) {
    db.prepare(
      `
      UPDATE body_composition SET bodyweight_kg = ?, body_fat_pct = ? WHERE id = ?
    `,
    ).run(bodyweight_kg, body_fat_pct ?? null, existing.id);
    return res.json({ id: existing.id, updated: true });
  }

  const result = db
    .prepare(
      `
    INSERT INTO body_composition (user_id, date, bodyweight_kg, body_fat_pct) VALUES (?, ?, ?, ?)
  `,
    )
    .run(req.user.id, date, bodyweight_kg, body_fat_pct ?? null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE entry
router.delete("/:id", (req, res) => {
  const row = db
    .prepare("SELECT id FROM body_composition WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Entry not found" });

  db.prepare("DELETE FROM body_composition WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
