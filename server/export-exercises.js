// Dumps the exercises table — shared reference data, not tied to any user —
// from the local dev database as JSON on stdout. Pairs with
// import-exercises.js to seed a fresh database (Docker locally, or
// production later) since there's currently no in-app way to create
// exercises.
//
//   node server/export-exercises.js > exercises.json

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "gym.db");
const db = new Database(dbPath, { readonly: true });

const exercises = db.prepare("SELECT * FROM exercises ORDER BY id").all();
db.close();

process.stdout.write(JSON.stringify(exercises));
process.stderr.write(`Exported ${exercises.length} exercise(s) from ${dbPath}\n`);
