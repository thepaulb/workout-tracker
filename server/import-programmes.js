// Imports programmes from JSON on stdin into whatever database DB_PATH
// points at. Pairs with export-programmes.js. Refuses to run if the target
// already has programmes.
//
//   node server/export-programmes.js | \
//     docker compose exec -T app node server/import-programmes.js

const db = require("./db");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const programmes = JSON.parse(input);

  const existing = db.prepare("SELECT COUNT(*) AS n FROM programmes").get().n;
  if (existing > 0) {
    console.error(
      `Target already has ${existing} programme(s) — refusing to import over existing data.`,
    );
    process.exit(1);
  }

  const insert = db.prepare(
    "INSERT INTO programmes (id, name, notes) VALUES (@id, @name, @notes)",
  );

  const importAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  importAll(programmes);

  console.log(`Imported ${programmes.length} programme(s).`);
});
