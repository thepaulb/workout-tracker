// Migration 004 — split weighted variants out of bodyweight exercises.
//
// Adds exercises.progression_type ('weight' | 'reps' | 'pace'), which
// drives which chart/stat the client shows for an exercise, and
// exercises.related_exercise_id, a nullable self-reference used only to
// link a bodyweight movement to its weighted variant for display.
//
// Backfills progression_type for all existing exercises, then:
//   - splits "Pull-up" sets with weight_kg > 0 into a new "Weighted
//     Pull-up" exercise (105 sets, weight_kg 5/10/15/20 — verified
//     against live data before writing this migration)
//   - pre-creates "Weighted Dips/push-ups" with no sets moved, since
//     Dips/push-ups currently has no weighted history yet
// Both new exercises are linked back to their bodyweight parent via
// related_exercise_id (bidirectional).
//
// Plain ADD COLUMN — no table rebuild needed, both columns are nullable
// or have a default, so existing rows are untouched by the schema change
// itself.
//
// Safe to run once. Re-running is a no-op (it detects the migrated schema
// and exits). A timestamped backup of gym.db is written before any change.
//
//   node server/migrations/004_split_weighted_pullups.js

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "gym.db");
const db = new Database(dbPath);

function columnExists(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

if (columnExists("exercises", "progression_type")) {
  console.log(
    "Already migrated (exercises.progression_type exists) — nothing to do.",
  );
  process.exit(0);
}

// --- backup ----------------------------------------------------------------

db.pragma("wal_checkpoint(TRUNCATE)"); // fold WAL into the main db file
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, "..", `gym.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup written: ${path.basename(backupPath)}`);

function counts() {
  return {
    exercises: db.prepare("SELECT COUNT(*) AS n FROM exercises").get().n,
    sets: db.prepare("SELECT COUNT(*) AS n FROM sets").get().n,
    goals: db.prepare("SELECT COUNT(*) AS n FROM goals").get().n,
  };
}

const before = counts();
console.log("Row counts before:", before);

const pullUp = db
  .prepare("SELECT id FROM exercises WHERE name = 'Pull-up'")
  .get();
const dipsPushUps = db
  .prepare("SELECT id FROM exercises WHERE name = 'Dips/push-ups'")
  .get();

if (!pullUp) {
  console.error("Exercise 'Pull-up' not found — aborting.");
  process.exit(1);
}
if (!dipsPushUps) {
  console.error("Exercise 'Dips/push-ups' not found — aborting.");
  process.exit(1);
}

const weightedPullUpSetsBefore = db
  .prepare(
    "SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ? AND weight_kg > 0",
  )
  .get(pullUp.id).n;
console.log(`"Pull-up" sets with weight_kg > 0 to move: ${weightedPullUpSetsBefore}`);

// --- migrate -----------------------------------------------------------

const migrate = db.transaction(() => {
  db.exec(`
    ALTER TABLE exercises ADD COLUMN progression_type TEXT NOT NULL DEFAULT 'reps';
    ALTER TABLE exercises ADD COLUMN related_exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL;
  `);

  // Backfill progression_type for everything that isn't the 'reps' default.
  db.exec(`
    UPDATE exercises SET progression_type = 'pace' WHERE category = 'cardio';
    UPDATE exercises SET progression_type = 'weight'
      WHERE category != 'cardio' AND equipment NOT IN ('bodyweight', 'none');
  `);

  // Split "Weighted Pull-up" out of "Pull-up".
  const weightedPullUpId = db
    .prepare(
      `INSERT INTO exercises (name, category, equipment, progression_type, related_exercise_id)
       VALUES ('Weighted Pull-up', 'pull', 'bodyweight', 'weight', ?)`,
    )
    .run(pullUp.id).lastInsertRowid;

  db.prepare(
    "UPDATE sets SET exercise_id = ? WHERE exercise_id = ? AND weight_kg > 0",
  ).run(weightedPullUpId, pullUp.id);

  db.prepare("UPDATE exercises SET related_exercise_id = ? WHERE id = ?").run(
    weightedPullUpId,
    pullUp.id,
  );

  // Pre-create "Weighted Dips/push-ups" — no history to move yet.
  const weightedDipsId = db
    .prepare(
      `INSERT INTO exercises (name, category, equipment, progression_type, related_exercise_id)
       VALUES ('Weighted Dips/push-ups', 'push', 'bodyweight', 'weight', ?)`,
    )
    .run(dipsPushUps.id).lastInsertRowid;

  db.prepare("UPDATE exercises SET related_exercise_id = ? WHERE id = ?").run(
    weightedDipsId,
    dipsPushUps.id,
  );

  const violations = db.pragma("foreign_key_check");
  if (violations.length > 0) {
    throw new Error(
      "foreign_key_check failed: " + JSON.stringify(violations),
    );
  }

  return { weightedPullUpId, weightedDipsId };
});

const { weightedPullUpId, weightedDipsId } = migrate();

// --- verify --------------------------------------------------------------

const after = counts();
console.log("Row counts after: ", after);

if (after.sets !== before.sets) {
  console.error("SET COUNT MISMATCH — restore from", backupPath);
  process.exit(1);
}
if (after.goals !== before.goals) {
  console.error("GOAL COUNT MISMATCH — restore from", backupPath);
  process.exit(1);
}
if (after.exercises !== before.exercises + 2) {
  console.error(
    "EXERCISE COUNT MISMATCH (expected +2) — restore from",
    backupPath,
  );
  process.exit(1);
}

const remainingWeightedOnPullUp = db
  .prepare(
    "SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ? AND weight_kg > 0",
  )
  .get(pullUp.id).n;
const movedToWeightedPullUp = db
  .prepare("SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ?")
  .get(weightedPullUpId).n;

console.log(
  `"Pull-up" sets with weight_kg > 0 remaining (should be 0): ${remainingWeightedOnPullUp}`,
);
console.log(
  `"Weighted Pull-up" sets after move (should be ${weightedPullUpSetsBefore}): ${movedToWeightedPullUp}`,
);

if (remainingWeightedOnPullUp !== 0 || movedToWeightedPullUp !== weightedPullUpSetsBefore) {
  console.error("SET SPLIT MISMATCH — restore from", backupPath);
  process.exit(1);
}

console.log("\nExercises after migration:");
console.table(
  db
    .prepare(
      `SELECT id, name, category, equipment, progression_type, related_exercise_id
       FROM exercises WHERE id IN (?, ?, ?, ?)`,
    )
    .all(pullUp.id, weightedPullUpId, dipsPushUps.id, weightedDipsId),
);

console.log("\nMigration complete.");
db.close();
