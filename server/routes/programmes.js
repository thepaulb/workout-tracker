const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all programmes
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM programmes ORDER BY name").all();
  res.json(rows);
});

// POST new programme
router.post("/", (req, res) => {
  const { name, notes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const existing = db
    .prepare("SELECT id FROM programmes WHERE name = ?")
    .get(name);
  if (existing) return res.json({ id: existing.id });

  const result = db
    .prepare("INSERT INTO programmes (name, notes) VALUES (?, ?)")
    .run(name, notes ?? null);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
