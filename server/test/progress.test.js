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
});

describe("GET /api/progress/prs", () => {
  it("returns a map keyed by exercise id", async () => {
    seedSet(sid, bench, { setNumber: 1, reps: 6, weightKg: 110 });
    const res = await request(app)
      .get("/api/progress/prs")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body[bench]).toEqual({ best_weight: 110, best_reps: 6 });
  });
});
