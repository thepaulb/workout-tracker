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

let user, cookie, exerciseId, sessionId;
beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
  exerciseId = seedExercise();
  sessionId = seedSession(user.id);
});

describe("POST /api/sets", () => {
  it("creates a set with nulls for omitted optional fields", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps: 8 });
    expect(res.status).toBe(201);
    const row = db.prepare("SELECT * FROM sets WHERE id = ?").get(res.body.id);
    expect(row).toMatchObject({ reps: 8, weight_kg: null, is_ladder: 0 });
  });

  it("coerces a truthy is_ladder to 1", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, is_ladder: true });
    const row = db.prepare("SELECT is_ladder FROM sets WHERE id = ?").get(res.body.id);
    expect(row.is_ladder).toBe(1);
  });

  it("requires session_id, exercise_id and set_number (400)", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId });
    expect(res.status).toBe(400);
  });

  it("accepts a valid rpe", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps: 5, rpe: 8.5 });
    expect(res.status).toBe(201);
    const row = db.prepare("SELECT rpe FROM sets WHERE id = ?").get(res.body.id);
    expect(row.rpe).toBe(8.5);
  });

  it("defaults rpe to null when omitted", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps: 5 });
    const row = db.prepare("SELECT rpe FROM sets WHERE id = ?").get(res.body.id);
    expect(row.rpe).toBeNull();
  });

  it.each([5.5, 10.5, 0, -1])("rejects rpe outside 6-10 (%s)", async (rpe) => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps: 5, rpe });
    expect(res.status).toBe(400);
  });

  it("rejects rpe not on a 0.5 increment", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, reps: 5, rpe: 7.3 });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/sets/:id", () => {
  it("updates only provided fields and leaves others intact", async () => {
    const setId = seedSet(sessionId, exerciseId, { reps: 5, weightKg: 100 });
    const res = await request(app)
      .patch(`/api/sets/${setId}`)
      .set("Cookie", cookie)
      .send({ reps: 6 });
    expect(res.status).toBe(200);
    const row = db.prepare("SELECT reps, weight_kg FROM sets WHERE id = ?").get(setId);
    expect(row).toMatchObject({ reps: 6, weight_kg: 100 }); // weight preserved
  });

  it("can toggle is_ladder off when explicitly false", async () => {
    const setId = seedSet(sessionId, exerciseId, { reps: 5 });
    db.prepare("UPDATE sets SET is_ladder = 1 WHERE id = ?").run(setId);
    const res = await request(app)
      .patch(`/api/sets/${setId}`)
      .set("Cookie", cookie)
      .send({ is_ladder: false });
    expect(res.status).toBe(200);
    expect(db.prepare("SELECT is_ladder FROM sets WHERE id = ?").get(setId).is_ladder).toBe(0);
  });

  it("updates rpe when given a valid value", async () => {
    const setId = seedSet(sessionId, exerciseId, { reps: 5, weightKg: 100 });
    const res = await request(app)
      .patch(`/api/sets/${setId}`)
      .set("Cookie", cookie)
      .send({ rpe: 9 });
    expect(res.status).toBe(200);
    expect(db.prepare("SELECT rpe FROM sets WHERE id = ?").get(setId).rpe).toBe(9);
  });

  it("rejects an out-of-range rpe on update (400)", async () => {
    const setId = seedSet(sessionId, exerciseId, { reps: 5 });
    const res = await request(app)
      .patch(`/api/sets/${setId}`)
      .set("Cookie", cookie)
      .send({ rpe: 12 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/sets/last/:exerciseId", () => {
  it("returns the most recent set for the exercise", async () => {
    const older = seedSession(user.id, { date: "2026-01-01" });
    const newer = seedSession(user.id, { date: "2026-02-01" });
    seedSet(older, exerciseId, { setNumber: 1, reps: 5, weightKg: 90 });
    seedSet(newer, exerciseId, { setNumber: 1, reps: 5, weightKg: 100 });

    const res = await request(app)
      .get(`/api/sets/last/${exerciseId}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ weight_kg: 100, date: "2026-02-01" });
  });

  it("returns null when the user has never logged the exercise", async () => {
    const res = await request(app)
      .get(`/api/sets/last/${exerciseId}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
