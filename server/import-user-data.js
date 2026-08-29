// Imports one user's sessions/sets/goals/body_composition from JSON on
// stdin into whatever database DB_PATH points at, attaching everything to
// whichever single user already exists there (the account just registered
// through the app — registration locks after the first user, so there's
// exactly one). Pairs with export-user-data.js. Run
// import-exercises.js and import-programmes.js first, since sets and goals
// reference exercise_id and sessions reference programme_id.
//
//   node server/export-user-data.js paul | \
//     ssh deploy@host 'cd workout-tracker && docker compose -f docker-compose.prod.yml exec -T app node server/import-user-data.js'

const db = require("./db");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const { sessions, sets, goals, body_composition } = JSON.parse(input);

  const users = db.prepare("SELECT id FROM users").all();
  if (users.length !== 1) {
    console.error(
      `Expected exactly one user in the target database, found ${users.length}.`,
    );
    process.exit(1);
  }
  const targetUserId = users[0].id;

  const existing = db.prepare("SELECT COUNT(*) AS n FROM sessions").get().n;
  if (existing > 0) {
    console.error(
      `Target already has ${existing} session(s) — refusing to import over existing data.`,
    );
    process.exit(1);
  }

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, user_id, date, programme_id, notes)
    VALUES (@id, @user_id, @date, @programme_id, @notes)
  `);
  const insertSet = db.prepare(`
    INSERT INTO sets (id, session_id, exercise_id, set_number, reps, weight_kg, weight_note, duration_min, distance_m, speed_kmh, rest_min, is_ladder, ladder_step, notes, rpe)
    VALUES (@id, @session_id, @exercise_id, @set_number, @reps, @weight_kg, @weight_note, @duration_min, @distance_m, @speed_kmh, @rest_min, @is_ladder, @ladder_step, @notes, @rpe)
  `);
  const insertGoal = db.prepare(`
    INSERT INTO goals (id, user_id, exercise_id, target_type, target_value, deadline, completed_at, created_at)
    VALUES (@id, @user_id, @exercise_id, @target_type, @target_value, @deadline, @completed_at, @created_at)
  `);
  const insertBody = db.prepare(`
    INSERT INTO body_composition (id, user_id, date, bodyweight_kg, body_fat_pct)
    VALUES (@id, @user_id, @date, @bodyweight_kg, @body_fat_pct)
  `);

  const importAll = db.transaction(() => {
    for (const s of sessions) insertSession.run({ ...s, user_id: targetUserId });
    for (const s of sets) insertSet.run(s);
    for (const g of goals) insertGoal.run({ ...g, user_id: targetUserId });
    for (const b of body_composition) insertBody.run({ ...b, user_id: targetUserId });
  });
  importAll();

  console.log(
    `Imported ${sessions.length} session(s), ${sets.length} set(s), ${goals.length} goal(s), ` +
      `${body_composition.length} body composition row(s) for user ${targetUserId}.`,
  );
});
