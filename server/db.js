const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// DB_PATH lets tests point at a throwaway database (e.g. ":memory:");
// production falls back to the bundled gym.db.
const db = new Database(process.env.DB_PATH || path.join(__dirname, "gym.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// A brand-new database (a fresh Docker volume, a fresh :memory: db) has no
// tables at all. Apply the schema once so there's something to read/write;
// an existing database already has "users" and this is a no-op.
const hasSchema = db
  .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'")
  .get();
if (!hasSchema) {
  db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
}

module.exports = db;
