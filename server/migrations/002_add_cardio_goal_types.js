// Migration 002 — allow cardio goal types.
//
// Widens goals.target_type from ('weight','reps') to also accept
// ('distance','pace'), so goals can be set against Run and other future
// cardio exercises. distance goals are in km, pace goals in km/h.
//
// Safe to run once. Re-running is a no-op (it detects the migrated schema
// and exits). A timestamped backup of gym.db is written before any change.
//
//   node server/migrations/002_add_cardio_goal_types.js

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "gym.db");
const db = new Database(dbPath);

function alreadyMigrated() {
  const row = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'goals'",
    )
    .get();
  return row?.sql.includes("'distance'");
}

if (alreadyMigrated()) {
  console.log("Already migrated (goals.target_type includes 'distance') — nothing to do.");
  process.exit(0);
}

// --- backup --------------------------------------------------------------

db.pragma("wal_checkpoint(TRUNCATE)"); // fold WAL into the main db file
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, "..", `gym.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup written: ${path.basename(backupPath)}`);

const before = db.prepare("SELECT COUNT(*) AS n FROM goals").get().n;
console.log("Goals before:", before);

// --- migrate -------------------------------------------------------------
// CHECK constraints can't be altered in place; rebuild the table.

db.pragma("foreign_keys = OFF");

const migrate = db.transaction(() => {
  db.exec(`
    CREATE TABLE goals_new (
      id           INTEGER PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      target_type  TEXT    NOT NULL CHECK(target_type IN ('weight','reps','distance','pace')),
      target_value REAL    NOT NULL,
      deadline     TEXT,
      completed_at TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO goals_new
      (id, user_id, exercise_id, target_type, target_value, deadline, completed_at, created_at)
      SELECT id, user_id, exercise_id, target_type, target_value, deadline, completed_at, created_at
        FROM goals;
    DROP TABLE goals;
    ALTER TABLE goals_new RENAME TO goals;
    CREATE INDEX idx_goals_user     ON goals(user_id);
    CREATE INDEX idx_goals_exercise ON goals(exercise_id);
  `);

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

const after = db.prepare("SELECT COUNT(*) AS n FROM goals").get().n;
console.log("Goals after: ", after);

if (before !== after) {
  console.error("ROW COUNT MISMATCH — restore from", backupPath);
  process.exit(1);
}

console.log("\nMigration complete. goals.target_type now accepts distance/pace.");
db.close();
