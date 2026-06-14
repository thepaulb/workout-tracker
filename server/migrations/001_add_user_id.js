// Migration 001 — add per-user ownership to personal data tables.
//
// Adds user_id to sessions, goals and body_composition (sets inherit
// ownership via their session). Backfills all existing rows to the
// owner account, and changes body_composition's UNIQUE(date) to
// UNIQUE(user_id, date) so multiple users can log the same date.
//
// Safe to run once. Re-running is a no-op (it detects the migrated schema
// and exits). A timestamped backup of gym.db is written before any change.
//
//   node server/migrations/001_add_user_id.js

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const OWNER_ID = 1; // paul — existing data is backfilled to this account

const dbPath = path.join(__dirname, "..", "gym.db");
const db = new Database(dbPath);

function columnExists(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

function counts() {
  return {
    sessions: db.prepare("SELECT COUNT(*) AS n FROM sessions").get().n,
    sets: db.prepare("SELECT COUNT(*) AS n FROM sets").get().n,
    body: db.prepare("SELECT COUNT(*) AS n FROM body_composition").get().n,
    goals: db.prepare("SELECT COUNT(*) AS n FROM goals").get().n,
  };
}

// --- guards --------------------------------------------------------------

if (columnExists("sessions", "user_id")) {
  console.log("Already migrated (sessions.user_id exists) — nothing to do.");
  process.exit(0);
}

const owner = db.prepare("SELECT id FROM users WHERE id = ?").get(OWNER_ID);
if (!owner) {
  console.error(`Owner user id=${OWNER_ID} not found — aborting.`);
  process.exit(1);
}

// --- backup --------------------------------------------------------------

db.pragma("wal_checkpoint(TRUNCATE)"); // fold WAL into the main db file
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, "..", `gym.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup written: ${path.basename(backupPath)}`);

const before = counts();
console.log("Row counts before:", before);

// --- migrate -------------------------------------------------------------
// Table rebuilds require foreign_keys OFF; this pragma must be toggled
// outside of any transaction.

db.pragma("foreign_keys = OFF");

const migrate = db.transaction(() => {
  // sessions
  db.exec(`
    CREATE TABLE sessions_new (
      id           INTEGER PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      date         TEXT    NOT NULL,
      programme_id INTEGER REFERENCES programmes(id) ON DELETE SET NULL,
      notes        TEXT
    );
    INSERT INTO sessions_new (id, user_id, date, programme_id, notes)
      SELECT id, ${OWNER_ID}, date, programme_id, notes FROM sessions;
    DROP TABLE sessions;
    ALTER TABLE sessions_new RENAME TO sessions;
    CREATE INDEX idx_sessions_user      ON sessions(user_id);
    CREATE INDEX idx_sessions_date      ON sessions(date);
    CREATE INDEX idx_sessions_programme ON sessions(programme_id);
  `);

  // goals
  db.exec(`
    CREATE TABLE goals_new (
      id           INTEGER PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      target_type  TEXT    NOT NULL CHECK(target_type IN ('weight','reps')),
      target_value REAL    NOT NULL,
      deadline     TEXT,
      completed_at TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO goals_new
      (id, user_id, exercise_id, target_type, target_value, deadline, completed_at, created_at)
      SELECT id, ${OWNER_ID}, exercise_id, target_type, target_value, deadline, completed_at, created_at
        FROM goals;
    DROP TABLE goals;
    ALTER TABLE goals_new RENAME TO goals;
    CREATE INDEX idx_goals_user     ON goals(user_id);
    CREATE INDEX idx_goals_exercise ON goals(exercise_id);
  `);

  // body_composition — also changes UNIQUE(date) -> UNIQUE(user_id, date)
  db.exec(`
    CREATE TABLE body_composition_new (
      id            INTEGER PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      date          TEXT    NOT NULL,
      bodyweight_kg REAL    NOT NULL,
      body_fat_pct  REAL,
      UNIQUE(user_id, date)
    );
    INSERT INTO body_composition_new (id, user_id, date, bodyweight_kg, body_fat_pct)
      SELECT id, ${OWNER_ID}, date, bodyweight_kg, body_fat_pct FROM body_composition;
    DROP TABLE body_composition;
    ALTER TABLE body_composition_new RENAME TO body_composition;
    CREATE INDEX idx_body_composition_user ON body_composition(user_id);
    CREATE INDEX idx_body_composition_date ON body_composition(date);
  `);

  // integrity check before commit
  const violations = db.pragma("foreign_key_check");
  if (violations.length > 0) {
    throw new Error(
      "foreign_key_check failed: " + JSON.stringify(violations),
    );
  }
});

migrate();
db.pragma("foreign_keys = ON");

// --- verify --------------------------------------------------------------

const after = counts();
console.log("Row counts after: ", after);

const mismatch = Object.keys(before).filter((k) => before[k] !== after[k]);
if (mismatch.length > 0) {
  console.error("ROW COUNT MISMATCH:", mismatch, "— restore from", backupPath);
  process.exit(1);
}

const unowned = {
  sessions: db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id IS NULL").get().n,
  goals: db.prepare("SELECT COUNT(*) AS n FROM goals WHERE user_id IS NULL").get().n,
  body: db.prepare("SELECT COUNT(*) AS n FROM body_composition WHERE user_id IS NULL").get().n,
};
console.log("Rows still unowned (should be all 0):", unowned);

console.log(`\nMigration complete. All existing data assigned to user_id=${OWNER_ID}.`);
db.close();
