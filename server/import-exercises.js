// Imports exercises from JSON on stdin into whatever database DB_PATH
// points at. Pairs with export-exercises.js, which produces that JSON from
// the local dev database. Refuses to run if the target already has
// exercises, so it's safe to leave lying around rather than a true one-off.
//
//   node server/export-exercises.js | \
//     docker compose exec -T app node server/import-exercises.js

const db = require("./db");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const exercises = JSON.parse(input);

  const existing = db.prepare("SELECT COUNT(*) AS n FROM exercises").get().n;
  if (existing > 0) {
    console.error(
      `Target already has ${existing} exercise(s) — refusing to import over existing data.`,
    );
    process.exit(1);
  }

  const insert = db.prepare(`
    INSERT INTO exercises (id, name, category, equipment, notes, progression_type, related_exercise_id)
    VALUES (@id, @name, @category, @equipment, @notes, @progression_type, @related_exercise_id)
  `);

  // Self-referencing related_exercise_id means some rows point at rows not
  // yet inserted — turn the FK check off for the bulk insert, then back on.
  db.pragma("foreign_keys = OFF");
  const importAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  importAll(exercises);
  db.pragma("foreign_keys = ON");

  console.log(`Imported ${exercises.length} exercise(s).`);
});
