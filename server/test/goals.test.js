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

let user, cookie, bench, sid;
beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
  bench = seedExercise({ name: "Bench Press" });
  sid = seedSession(user.id, { date: "2026-01-10" });
});

describe("POST /api/goals", () => {
  it("requires exercise_id, target_type and target_value (400)", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Cookie", cookie)
      .send({ exercise_id: bench, target_type: "weight" });
    expect(res.status).toBe(400);
  });

  it("is created open when the target has not yet been met", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 5, weightKg: 80 });
    const res = await request(app)
      .post("/api/goals")
      .set("Cookie", cookie)
      .send({ exercise_id: bench, target_type: "weight", target_value: 120 });
    expect(res.status).toBe(201);
    const row = db.prepare("SELECT completed_at FROM goals WHERE id = ?").get(res.body.id);
    expect(row.completed_at).toBeNull();
  });

  it("is auto-completed on creation when already achieved", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 5, weightKg: 130 });
    const res = await request(app)
      .post("/api/goals")
      .set("Cookie", cookie)
      .send({ exercise_id: bench, target_type: "weight", target_value: 120 });
    const row = db.prepare("SELECT completed_at FROM goals WHERE id = ?").get(res.body.id);
    expect(row.completed_at).not.toBeNull();
  });
});

describe("POST /api/goals/check", () => {
  it("flips an open goal to completed once the target is reached", async () => {
    const goalId = db
      .prepare(
        "INSERT INTO goals (user_id, exercise_id, target_type, target_value) VALUES (?, ?, 'reps', 10)",
      )
      .run(user.id, bench).lastInsertRowid;

    // Not yet met -> no change.
    seedSet(sid, bench, { setNumber: 1, reps: 8 });
    let res = await request(app)
      .post("/api/goals/check")
      .set("Cookie", cookie)
      .send({ exercise_id: bench });
    expect(res.body.completed).toEqual([]);

    // Now log a qualifying set -> goal completes.
    seedSet(sid, bench, { setNumber: 2, reps: 10 });
    res = await request(app)
      .post("/api/goals/check")
      .set("Cookie", cookie)
      .send({ exercise_id: bench });
    expect(res.body.completed).toEqual([Number(goalId)]);
    expect(
      db.prepare("SELECT completed_at FROM goals WHERE id = ?").get(goalId).completed_at,
    ).not.toBeNull();
  });

  it("requires exercise_id (400)", async () => {
    const res = await request(app)
      .post("/api/goals/check")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/goals", () => {
  it("returns goals with exercise name and current value", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 5, weightKg: 95 });
    db.prepare(
      "INSERT INTO goals (user_id, exercise_id, target_type, target_value) VALUES (?, ?, 'weight', 120)",
    ).run(user.id, bench);

    const res = await request(app).get("/api/goals").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      exercise_name: "Bench Press",
      current_value: 95,
      target_value: 120,
    });
  });
});
