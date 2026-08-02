// Migration 003 — add RPE tracking to sets.
//
// Adds a nullable sets.rpe column (rate of perceived exertion, 6-10 in
// 0.5 steps). Plain ADD COLUMN — no table rebuild needed since the column
// is nullable with no constraint, so existing rows are untouched.
//
// Safe to run once. Re-running is a no-op (it detects the migrated schema
// and exits). A timestamped backup of gym.db is written before any change.
//
//   node server/migrations/003_add_rpe.js

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

if (columnExists("sets", "rpe")) {
  console.log("Already migrated (sets.rpe exists) — nothing to do.");
  process.exit(0);
}

// --- backup --------------------------------------------------------------

db.pragma("wal_checkpoint(TRUNCATE)"); // fold WAL into the main db file
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(__dirname, "..", `gym.db.bak-${stamp}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup written: ${path.basename(backupPath)}`);

const before = db.prepare("SELECT COUNT(*) AS n FROM sets").get().n;
console.log("Sets before:", before);

// --- migrate -------------------------------------------------------------

db.exec("ALTER TABLE sets ADD COLUMN rpe REAL");

// --- verify --------------------------------------------------------------

const after = db.prepare("SELECT COUNT(*) AS n FROM sets").get().n;
console.log("Sets after: ", after);

if (before !== after) {
  console.error("ROW COUNT MISMATCH — restore from", backupPath);
  process.exit(1);
}

const nonNullRpe = db
  .prepare("SELECT COUNT(*) AS n FROM sets WHERE rpe IS NOT NULL")
  .get().n;
console.log("Existing rows with rpe set (should be 0):", nonNullRpe);

console.log("\nMigration complete. sets.rpe is now available (nullable).");
db.close();
