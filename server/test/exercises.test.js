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

let user, cookie;
beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
});

describe("GET /api/exercises", () => {
  it("lists exercises ordered by category then name", async () => {
    seedExercise({ name: "Squat", category: "compound" });
    seedExercise({ name: "Bench Press", category: "push" });
    seedExercise({ name: "Overhead Press", category: "push" });

    const res = await request(app).get("/api/exercises").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.map((e) => e.name)).toEqual([
      "Squat", // compound
      "Bench Press", // push (alphabetical within category)
      "Overhead Press",
    ]);
  });
});

describe("GET /api/exercises/:id", () => {
  it("returns the exercise with the user's set history only", async () => {
    const bench = seedExercise({ name: "Bench Press" });
    const other = seedUser("bob");
    const mySession = seedSession(user.id, { date: "2026-01-01" });
    const theirSession = seedSession(other.id, { date: "2026-01-02" });
    seedSet(mySession, bench, { setNumber: 1, reps: 5, weightKg: 100 });
    seedSet(theirSession, bench, { setNumber: 1, reps: 5, weightKg: 200 });

    const res = await request(app)
      .get(`/api/exercises/${bench}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Bench Press");
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].weight_kg).toBe(100);
  });

  it("includes the related exercise when linked", async () => {
    const pullUp = seedExercise({ name: "Pull-up", category: "pull", equipment: "bodyweight" });
    const weightedPullUp = seedExercise({
      name: "Weighted Pull-up",
      category: "pull",
      equipment: "bodyweight",
      progressionType: "weight",
      relatedExerciseId: pullUp,
    });

    const res = await request(app)
      .get(`/api/exercises/${weightedPullUp}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.related_exercise).toMatchObject({ id: pullUp, name: "Pull-up" });
  });

  it("returns related_exercise: null when not linked", async () => {
    const bench = seedExercise({ name: "Bench Press" });
    const res = await request(app)
      .get(`/api/exercises/${bench}`)
      .set("Cookie", cookie);
    expect(res.body.related_exercise).toBeNull();
  });

  it("404s for an unknown exercise", async () => {
    const res = await request(app).get("/api/exercises/999").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/exercises/:id — PR flags (first time only)", () => {
  it("flags weight/reps PRs the first time a value is exceeded, not on ties or repeats", async () => {
    const squat = seedExercise({ name: "Squat", progressionType: "weight" });
    const s1 = seedSession(user.id, { date: "2026-01-01" });
    const s2 = seedSession(user.id, { date: "2026-01-08" });
    const s3 = seedSession(user.id, { date: "2026-01-15" });
    const s4 = seedSession(user.id, { date: "2026-01-22" });
    const s5 = seedSession(user.id, { date: "2026-01-29" });
    seedSet(s1, squat, { reps: 5, weightKg: 80 }); // first ever -> PR
    seedSet(s2, squat, { reps: 5, weightKg: 80 }); // ties best -> not a PR
    seedSet(s3, squat, { reps: 3, weightKg: 90 }); // new best weight -> PR
    seedSet(s4, squat, { reps: 8, weightKg: 85 }); // below best weight, but new best reps -> reps PR only
    seedSet(s5, squat, { reps: 8, weightKg: 90 }); // ties both bests -> not a PR

    const res = await request(app)
      .get(`/api/exercises/${squat}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);

    const byDate = Object.fromEntries(
      res.body.history.map((s) => [s.date, s]),
    );
    expect(byDate["2026-01-01"]).toMatchObject({ is_weight_pr: 1, is_reps_pr: 1 });
    expect(byDate["2026-01-08"]).toMatchObject({ is_weight_pr: 0, is_reps_pr: 0 });
    expect(byDate["2026-01-15"]).toMatchObject({ is_weight_pr: 1, is_reps_pr: 0 });
    expect(byDate["2026-01-22"]).toMatchObject({ is_weight_pr: 0, is_reps_pr: 1 });
    expect(byDate["2026-01-29"]).toMatchObject({ is_weight_pr: 0, is_reps_pr: 0 });
  });

  it("never flags a reps PR for a timed exercise, even on its first-ever set", async () => {
    // Regression: reps is pinned at ~1 for an isometric hold, so without the
    // progression_type guard the first set would trivially "PR" on reps.
    const hollow = seedExercise({ name: "Hollow Hold", progressionType: "time" });
    const s1 = seedSession(user.id, { date: "2026-01-01" });
    const s2 = seedSession(user.id, { date: "2026-01-08" });
    seedSet(s1, hollow, { reps: 1, durationMin: 1 }); // first ever -> duration PR, not reps
    seedSet(s2, hollow, { reps: 1, durationMin: 1.5 }); // longer hold -> new duration PR

    const res = await request(app)
      .get(`/api/exercises/${hollow}`)
      .set("Cookie", cookie);
    const byDate = Object.fromEntries(
      res.body.history.map((s) => [s.date, s]),
    );
    expect(byDate["2026-01-01"]).toMatchObject({ is_reps_pr: 0, is_duration_pr: 1 });
    expect(byDate["2026-01-08"]).toMatchObject({ is_reps_pr: 0, is_duration_pr: 1 });
  });
});

describe("POST /api/exercises", () => {
  it("creates an exercise", async () => {
    const res = await request(app)
      .post("/api/exercises")
      .set("Cookie", cookie)
      .send({ name: "Deadlift", category: "compound", equipment: "barbell" });
    expect(res.status).toBe(201);
    expect(db.prepare("SELECT name FROM exercises WHERE id = ?").get(res.body.id).name).toBe("Deadlift");
  });

  it("defaults progression_type to 'reps' when not provided", async () => {
    const res = await request(app)
      .post("/api/exercises")
      .set("Cookie", cookie)
      .send({ name: "Squat", category: "compound", equipment: "barbell" });
    expect(res.status).toBe(201);
    expect(
      db.prepare("SELECT progression_type FROM exercises WHERE id = ?").get(res.body.id)
        .progression_type,
    ).toBe("reps");
  });

  it("accepts progression_type and related_exercise_id", async () => {
    const pullUp = seedExercise({ name: "Pull-up", category: "pull", equipment: "bodyweight" });
    const res = await request(app)
      .post("/api/exercises")
      .set("Cookie", cookie)
      .send({
        name: "Weighted Pull-up",
        category: "pull",
        equipment: "bodyweight",
        progression_type: "weight",
        related_exercise_id: pullUp,
      });
    expect(res.status).toBe(201);
    const row = db.prepare("SELECT * FROM exercises WHERE id = ?").get(res.body.id);
    expect(row).toMatchObject({ progression_type: "weight", related_exercise_id: pullUp });
  });

  it("requires name, category and equipment (400)", async () => {
    const res = await request(app)
      .post("/api/exercises")
      .set("Cookie", cookie)
      .send({ name: "Incomplete" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/exercises/:id", () => {
  it("updates only provided fields", async () => {
    const id = seedExercise({ name: "Bench", category: "push", equipment: "barbell" });
    const res = await request(app)
      .patch(`/api/exercises/${id}`)
      .set("Cookie", cookie)
      .send({ notes: "pause reps" });
    expect(res.status).toBe(200);
    const row = db.prepare("SELECT * FROM exercises WHERE id = ?").get(id);
    expect(row).toMatchObject({ name: "Bench", notes: "pause reps" });
  });

  it("updates progression_type and related_exercise_id", async () => {
    const pullUp = seedExercise({ name: "Pull-up", category: "pull", equipment: "bodyweight" });
    const weightedPullUp = seedExercise({
      name: "Weighted Pull-up",
      category: "pull",
      equipment: "bodyweight",
    });

    const res = await request(app)
      .patch(`/api/exercises/${weightedPullUp}`)
      .set("Cookie", cookie)
      .send({ progression_type: "weight", related_exercise_id: pullUp });
    expect(res.status).toBe(200);

    const row = db.prepare("SELECT * FROM exercises WHERE id = ?").get(weightedPullUp);
    expect(row).toMatchObject({ progression_type: "weight", related_exercise_id: pullUp });
  });
});
