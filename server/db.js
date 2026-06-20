const Database = require("better-sqlite3");
const path = require("path");

// DB_PATH lets tests point at a throwaway database (e.g. ":memory:");
// production falls back to the bundled gym.db.
const db = new Database(process.env.DB_PATH || path.join(__dirname, "gym.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = db;
