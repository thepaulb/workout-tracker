// Shared helpers for server tests: schema reset, seeding, and auth cookies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import jwt from "jsonwebtoken";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The singleton db connection (opened against DB_PATH=:memory: in tests).
const db = require("../db");

const SCHEMA = fs.readFileSync(
  path.join(__dirname, "..", "schema.sql"),
  "utf8",
);

const TABLES = [
  "sets",
  "sessions",
  "goals",
  "body_composition",
  "programmes",
  "exercises",
  "users",
];

// Drop every table and rebuild from schema.sql so each test starts clean.
export function resetDb() {
  db.pragma("foreign_keys = OFF");
  for (const t of TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`);
  db.exec(SCHEMA);
  db.pragma("foreign_keys = ON");
}

// Insert a user and return { id, username }. Password hash is irrelevant
// for most tests (we mint cookies directly), so a placeholder is fine.
export function seedUser(username = "tester", passwordHash = "x") {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
  return { id: Number(lastInsertRowid), username };
}

export function seedExercise(fields = {}) {
  const {
    name = "Bench Press",
    category = "push",
    equipment = "barbell",
    notes = null,
  } = fields;
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO exercises (name, category, equipment, notes) VALUES (?, ?, ?, ?)",
    )
    .run(name, category, equipment, notes);
  return Number(lastInsertRowid);
}

export function seedSession(userId, fields = {}) {
  const { date = "2026-01-01", programmeId = null, notes = null } = fields;
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO sessions (user_id, date, programme_id, notes) VALUES (?, ?, ?, ?)",
    )
    .run(userId, date, programmeId, notes);
  return Number(lastInsertRowid);
}

export function seedSet(sessionId, exerciseId, fields = {}) {
  const {
    setNumber = 1,
    reps = null,
    weightKg = null,
    weightNote = null,
    rpe = null,
    speedKmh = null,
  } = fields;
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO sets (session_id, exercise_id, set_number, reps, weight_kg, weight_note, rpe, speed_kmh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(sessionId, exerciseId, setNumber, reps, weightKg, weightNote, rpe, speedKmh);
  return Number(lastInsertRowid);
}

// Build a signed auth cookie for supertest: .set("Cookie", authCookie(user)).
export function authCookie(user) {
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
  );
  return `token=${token}`;
}

export { db };
