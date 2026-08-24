// Full database backup — writes a point-in-time copy of gym.db that can be
// dropped back in to recreate the database if it's ever lost or corrupted.
//
// Uses better-sqlite3's built-in backup() (SQLite's online backup API), so
// it's safe to run while the server is up: it copies committed pages
// straight from the live db, including anything only in the WAL, without
// needing a manual checkpoint or blocking writers for more than a moment.
//
// To restore: stop the server, then copy the backup file over gym.db
//   cp server/backups/gym-<timestamp>.db server/gym.db
//
//   node server/backup.js
//   npm run backup

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "gym.db");
const backupDir = path.join(__dirname, "backups");

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `gym-${stamp}.db`);

const db = new Database(dbPath, { readonly: true });

db.backup(backupPath)
  .then(() => {
    db.close();

    const counts = new Database(backupPath, { readonly: true });
    const rows = {
      exercises: counts.prepare("SELECT COUNT(*) AS n FROM exercises").get().n,
      sessions: counts.prepare("SELECT COUNT(*) AS n FROM sessions").get().n,
      sets: counts.prepare("SELECT COUNT(*) AS n FROM sets").get().n,
      users: counts.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      body_composition: counts.prepare("SELECT COUNT(*) AS n FROM body_composition").get().n,
      goals: counts.prepare("SELECT COUNT(*) AS n FROM goals").get().n,
    };
    counts.close();

    console.log(`Backup written: ${path.relative(process.cwd(), backupPath)}`);
    console.log("Row counts:", rows);
  })
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
