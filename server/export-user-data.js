// Dumps one user's sessions, sets, goals and body_composition from the
// local dev database as JSON on stdout — named by username so a migration
// can pick the real account and deliberately leave others (e.g. a local
// "Test" account) behind. Pairs with import-user-data.js. Run
// export/import-exercises.js and export/import-programmes.js first: sets
// and goals reference exercise_id, sessions reference programme_id.
//
//   node server/export-user-data.js paul > paul-data.json

const path = require("path");
const Database = require("better-sqlite3");

const username = process.argv[2];
if (!username) {
  console.error("Usage: node server/export-user-data.js <username>");
  process.exit(1);
}

const dbPath = path.join(__dirname, "gym.db");
const db = new Database(dbPath, { readonly: true });

const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (!user) {
  console.error(`No user found with username "${username}"`);
  process.exit(1);
}

const sessions = db
  .prepare("SELECT * FROM sessions WHERE user_id = ?")
  .all(user.id);

const sessionIds = sessions.map((s) => s.id);
const sets = sessionIds.length
  ? db
      .prepare(
        `SELECT * FROM sets WHERE session_id IN (${sessionIds.map(() => "?").join(",")})`,
      )
      .all(...sessionIds)
  : [];

const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(user.id);
const bodyComposition = db
  .prepare("SELECT * FROM body_composition WHERE user_id = ?")
  .all(user.id);

db.close();

process.stdout.write(
  JSON.stringify({ sessions, sets, goals, body_composition: bodyComposition }),
);
process.stderr.write(
  `Exported for "${username}": ${sessions.length} session(s), ${sets.length} set(s), ` +
    `${goals.length} goal(s), ${bodyComposition.length} body composition row(s)\n`,
);
