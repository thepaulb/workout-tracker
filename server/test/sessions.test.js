import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
  db,
  seedUser,
  seedExercise,
  seedSession,
  seedSet,
  authCookie,
} from "./helpers.js";

let user, cookie, exerciseId;
beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
  exerciseId = seedExercise();
});

describe("GET /api/sessions", () => {
  it("returns sessions with programme name and set count, newest first", async () => {
    const prog = db
      .prepare("INSERT INTO programmes (name) VALUES (?)")
      .run("5x5").lastInsertRowid;
    const older = seedSession(user.id, { date: "2026-01-01" });
    const newer = seedSession(user.id, { date: "2026-03-01", programmeId: prog });
    seedSet(newer, exerciseId, { setNumber: 1, reps: 5 });
    seedSet(newer, exerciseId, { setNumber: 2, reps: 5 });

    const res = await request(app).get("/api/sessions").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.id)).toEqual([newer, older]); // DESC by date
    expect(res.body[0]).toMatchObject({ programme: "5x5", set_count: 2 });
    expect(res.body[1]).toMatchObject({ programme: null, set_count: 0 });
  });
});

describe("GET /api/sessions/:id", () => {
  it("returns the session with its sets and exercise metadata", async () => {
    const sid = seedSession(user.id);
    seedSet(sid, exerciseId, { setNumber: 1, reps: 5, weightKg: 100 });
    const res = await request(app)
      .get(`/api/sessions/${sid}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sid);
    expect(res.body.sets).toHaveLength(1);
    expect(res.body.sets[0]).toMatchObject({
      exercise_name: "Bench Press",
      category: "push",
      equipment: "barbell",
    });
  });

  it("404s for a non-existent session", async () => {
    const res = await request(app).get("/api/sessions/999").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/sessions", () => {
  it("creates a session scoped to the user", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set("Cookie", cookie)
      .send({ date: "2026-04-01", notes: "leg day" });
    expect(res.status).toBe(201);
    const row = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(res.body.id);
    expect(row).toMatchObject({ user_id: user.id, date: "2026-04-01", notes: "leg day" });
  });

  it("requires a date (400)", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set("Cookie", cookie)
      .send({ notes: "no date" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/sessions/:id", () => {
  it("updates only provided fields (COALESCE keeps the rest)", async () => {
    const sid = seedSession(user.id, { date: "2026-01-01", notes: "original" });
    const res = await request(app)
      .patch(`/api/sessions/${sid}`)
      .set("Cookie", cookie)
      .send({ notes: "updated" });
    expect(res.status).toBe(200);
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sid);
    expect(row.notes).toBe("updated");
    expect(row.date).toBe("2026-01-01"); // unchanged
  });
});

describe("DELETE /api/sessions/:id", () => {
  it("deletes the session and cascades to its sets", async () => {
    const sid = seedSession(user.id);
    seedSet(sid, exerciseId, { reps: 5 });
    const res = await request(app)
      .delete(`/api/sessions/${sid}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(db.prepare("SELECT COUNT(*) AS n FROM sets WHERE session_id = ?").get(sid).n).toBe(0);
  });
});

describe("GET /api/sessions/stats/volume", () => {
  it("sums reps*weight per week, ignoring rows with null weight or reps", async () => {
    const sid = seedSession(user.id, { date: "2026-01-05" });
    seedSet(sid, exerciseId, { setNumber: 1, reps: 5, weightKg: 100 }); // 500
    seedSet(sid, exerciseId, { setNumber: 2, reps: 5, weightKg: 100 }); // 500
    seedSet(sid, exerciseId, { setNumber: 3, reps: 10, weightKg: null }); // excluded

    const res = await request(app)
      .get("/api/sessions/stats/volume")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].volume_kg).toBe(1000);
    expect(res.body[0].total_sets).toBe(2);
  });
});
