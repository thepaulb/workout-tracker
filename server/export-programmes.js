// Dumps the programmes table — shared reference data, not tied to any user
// — from the local dev database as JSON on stdout. Pairs with
// import-programmes.js. Same gap as exercises: there's no in-app way to
// create a programme either, and sessions can reference one by id.
//
//   node server/export-programmes.js > programmes.json

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "gym.db");
const db = new Database(dbPath, { readonly: true });

const programmes = db.prepare("SELECT * FROM programmes ORDER BY id").all();
db.close();

process.stdout.write(JSON.stringify(programmes));
process.stderr.write(`Exported ${programmes.length} programme(s) from ${dbPath}\n`);
