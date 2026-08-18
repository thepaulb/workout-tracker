import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import {
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

describe("GET /api/progress/bests", () => {
  it("computes max weight/reps, session count and total volume", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 5, weightKg: 100 }); // vol 500
    seedSet(sid, bench, { setNumber: 2, reps: 8, weightKg: 80 }); // vol 640

    const res = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      name: "Bench Press",
      best_weight: 100,
      best_reps: 8,
      session_count: 1,
      total_volume: 1140,
      last_session: "2026-01-10",
    });
  });

  it("orders exercises by total volume descending", async () => {
    const squat = seedExercise({ name: "Squat", category: "compound" });
    seedSet(sid, bench, { setNumber: 1, reps: 5, weightKg: 50 }); // 250
    seedSet(sid, squat, { setNumber: 1, reps: 5, weightKg: 100 }); // 500

    const res = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", cookie);
    expect(res.body.map((r) => r.name)).toEqual(["Squat", "Bench Press"]);
  });

  it("includes recent_sets from only the most recent session date", async () => {
    const older = seedSession(user.id, { date: "2026-01-05" });
    const newer = seedSession(user.id, { date: "2026-01-10" });
    seedSet(older, bench, { setNumber: 1, reps: 5, weightKg: 90 });
    seedSet(newer, bench, { setNumber: 1, reps: 5, weightKg: 100, rpe: 8 });
    seedSet(newer, bench, { setNumber: 2, reps: 3, weightKg: 110, rpe: 9 });

    const res = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", cookie);
    const row = res.body.find((r) => r.name === "Bench Press");
    expect(row.recent_sets).toHaveLength(2);
    expect(row.recent_sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ weight_kg: 100, reps: 5, rpe: 8 }),
        expect.objectContaining({ weight_kg: 110, reps: 3, rpe: 9 }),
      ]),
    );
  });

  it("includes recent_sets from every session on a multi-session most-recent date", async () => {
    const am = seedSession(user.id, { date: "2026-01-10" });
    const pm = seedSession(user.id, { date: "2026-01-10" });
    seedSet(am, bench, { setNumber: 1, reps: 5, weightKg: 90 });
    seedSet(pm, bench, { setNumber: 1, reps: 5, weightKg: 95 });

    const res = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", cookie);
    const row = res.body.find((r) => r.name === "Bench Press");
    expect(row.recent_sets).toHaveLength(2);
  });

  it("computes best_duration for a timed (isometric) exercise", async () => {
    const hollow = seedExercise({
      name: "Hollow",
      category: "core",
      equipment: "bodyweight",
      progressionType: "time",
    });
    seedSet(sid, hollow, { setNumber: 1, reps: 1, durationMin: 1 });
    seedSet(sid, hollow, { setNumber: 2, reps: 1, durationMin: 1.5 });

    const res = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", cookie);
    const row = res.body.find((r) => r.name === "Hollow");
    expect(row).toMatchObject({ progression_type: "time", best_duration: 1.5 });
    expect(row.recent_sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ duration_min: 1 }),
        expect.objectContaining({ duration_min: 1.5 }),
      ]),
    );
  });

});

describe("GET /api/progress/prs", () => {
  it("returns a map keyed by exercise id", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 6, weightKg: 110 });
    const res = await request(app)
      .get("/api/progress/prs")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body[bench]).toEqual({
      best_weight: 110,
      best_reps: 6,
      best_distance: null,
      best_speed: null,
      best_duration: null,
    });
  });

  it("returns best_duration for a timed exercise", async () => {
    const hollow = seedExercise({
      name: "Hollow",
      category: "core",
      equipment: "bodyweight",
      progressionType: "time",
    });
    seedSet(sid, hollow, { setNumber: 1, reps: 1, durationMin: 1.5 });

    const res = await request(app)
      .get("/api/progress/prs")
      .set("Cookie", cookie);
    expect(res.body[hollow].best_duration).toBe(1.5);
  });
});
