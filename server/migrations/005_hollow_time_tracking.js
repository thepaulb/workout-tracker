// Migration 005 — fix Hollow to track hold time instead of reps/weight.
//
// Hollow (id 10, category "core") was left on progression_type='reps' when
// really it's an isometric hold: every set is ~1 rep held for a duration,
// so the metric that matters is time, not reps or weight. There was no
// 'time' progression_type to put it on, so the set-logging UI never had a
// duration field for it, and the two sets already logged are unusable:
// one has no duration at all, and the other was force-fed duration_min via
// the API with a stray weight_kg=0, which made the client mis-render it as
// a cardio set (formatSet picked cardio formatting off "has duration_min"
// rather than off the exercise's own type).
//
// This migration:
//   - flips Hollow's progression_type to 'time' (no ALTER needed — the
//     column is free-form TEXT, no CHECK constraint restricts its values)
//   - deletes Hollow's existing sets, since neither logged set is valid
//     under the new metric (per user instruction — these were logged
//     before proper time tracking existed and aren't worth preserving)
//
// Safe to run once. Re-running is a no-op (it detects the migrated
// progression_type and exits). A timestamped backup of gym.db is written
// before any change.
//
//   node server/migrations/005_hollow_time_tracking.js

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "gym.db");
const db = new Database(dbPath);

const hollow = db.prepare("SELECT id, progression_type FROM exercises WHERE name = 'Hollow'").get();

if (!hollow) {
  console.error("Exercise 'Hollow' not found — aborting.");
  process.exit(1);
}

if (hollow.progression_type === "time") {
  console.log("Already migrated (Hollow.progression_type = 'time') — nothing to do.");
  process.exit(0);
}

// --- backup ----------------------------------------------------------------

db.pragma("wal_checkpoint(TRUNCATE)"); // fold WAL into the main db file
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, "..", `gym.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup written: ${path.basename(backupPath)}`);

const setsBefore = db.prepare("SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ?").get(hollow.id).n;
console.log(`Hollow sets to delete: ${setsBefore}`);

// --- migrate -----------------------------------------------------------

const migrate = db.transaction(() => {
  db.prepare("UPDATE exercises SET progression_type = 'time' WHERE id = ?").run(hollow.id);
  db.prepare("DELETE FROM sets WHERE exercise_id = ?").run(hollow.id);
});

migrate();

// --- verify --------------------------------------------------------------

const after = db.prepare("SELECT progression_type FROM exercises WHERE id = ?").get(hollow.id);
const setsAfter = db.prepare("SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ?").get(hollow.id).n;

console.log("Hollow.progression_type after:", after.progression_type);
console.log("Hollow sets after (should be 0):", setsAfter);

if (after.progression_type !== "time" || setsAfter !== 0) {
  console.error("MIGRATION MISMATCH — restore from", backupPath);
  process.exit(1);
}

console.log("\nMigration complete.");
db.close();
