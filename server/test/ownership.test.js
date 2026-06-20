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

// Two users; everything below verifies that user B can never see or mutate
// user A's data. This is the core multi-user isolation guard.
let alice, bob, exerciseId, aliceSession, aliceSet;

beforeEach(() => {
  alice = seedUser("alice");
  bob = seedUser("bob");
  exerciseId = seedExercise();
  aliceSession = seedSession(alice.id, { date: "2026-02-01" });
  aliceSet = seedSet(aliceSession, exerciseId, { reps: 5, weightKg: 100 });
});

describe("sessions scoping", () => {
  it("only lists the requester's own sessions", async () => {
    seedSession(bob.id, { date: "2026-02-02" });
    const res = await request(app)
      .get("/api/sessions")
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1); // bob sees only his own
  });

  it("404s when fetching another user's session by id", async () => {
    const res = await request(app)
      .get(`/api/sessions/${aliceSession}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(404);
  });

  it("does not delete another user's session", async () => {
    const res = await request(app)
      .delete(`/api/sessions/${aliceSession}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(404);
    expect(
      db.prepare("SELECT id FROM sessions WHERE id = ?").get(aliceSession),
    ).toBeTruthy();
  });

  it("does not patch another user's session", async () => {
    const res = await request(app)
      .patch(`/api/sessions/${aliceSession}`)
      .set("Cookie", authCookie(bob))
      .send({ notes: "hacked" });
    expect(res.status).toBe(404);
  });
});

describe("sets scoping", () => {
  it("404s listing sets for another user's session", async () => {
    const res = await request(app)
      .get(`/api/sets/session/${aliceSession}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(404);
  });

  it("cannot create a set in another user's session", async () => {
    const res = await request(app)
      .post("/api/sets")
      .set("Cookie", authCookie(bob))
      .send({ session_id: aliceSession, exercise_id: exerciseId, set_number: 2 });
    expect(res.status).toBe(404);
  });

  it("cannot patch or delete another user's set", async () => {
    const patch = await request(app)
      .patch(`/api/sets/${aliceSet}`)
      .set("Cookie", authCookie(bob))
      .send({ reps: 99 });
    expect(patch.status).toBe(404);

    const del = await request(app)
      .delete(`/api/sets/${aliceSet}`)
      .set("Cookie", authCookie(bob));
    expect(del.status).toBe(404);

    // Alice's set is untouched.
    const row = db.prepare("SELECT reps FROM sets WHERE id = ?").get(aliceSet);
    expect(row.reps).toBe(5);
  });

  it("last/:exerciseId ignores other users' history", async () => {
    const res = await request(app)
      .get(`/api/sets/last/${exerciseId}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(200);
    expect(res.body).toBeNull(); // bob has no sets for this exercise
  });
});

describe("progress scoping", () => {
  it("bests reflect only the requester's data", async () => {
    const aliceRes = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", authCookie(alice));
    expect(aliceRes.body).toHaveLength(1);

    const bobRes = await request(app)
      .get("/api/progress/bests")
      .set("Cookie", authCookie(bob));
    expect(bobRes.body).toEqual([]);
  });

  it("prs map is empty for a user with no sets", async () => {
    const res = await request(app)
      .get("/api/progress/prs")
      .set("Cookie", authCookie(bob));
    expect(res.body).toEqual({});
  });
});

describe("body scoping", () => {
  it("only returns the requester's entries", async () => {
    db.prepare(
      "INSERT INTO body_composition (user_id, date, bodyweight_kg) VALUES (?, ?, ?)",
    ).run(alice.id, "2026-02-01", 80);
    const res = await request(app)
      .get("/api/body")
      .set("Cookie", authCookie(bob));
    expect(res.body).toEqual([]);
  });

  it("cannot delete another user's entry", async () => {
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO body_composition (user_id, date, bodyweight_kg) VALUES (?, ?, ?)",
      )
      .run(alice.id, "2026-02-01", 80);
    const res = await request(app)
      .delete(`/api/body/${lastInsertRowid}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(404);
  });
});

describe("goals scoping", () => {
  it("only lists the requester's goals", async () => {
    db.prepare(
      "INSERT INTO goals (user_id, exercise_id, target_type, target_value) VALUES (?, ?, 'weight', 120)",
    ).run(alice.id, exerciseId);
    const res = await request(app)
      .get("/api/goals")
      .set("Cookie", authCookie(bob));
    expect(res.body).toEqual([]);
  });

  it("cannot delete another user's goal", async () => {
    const { lastInsertRowid } = db
      .prepare(
        "INSERT INTO goals (user_id, exercise_id, target_type, target_value) VALUES (?, ?, 'weight', 120)",
      )
      .run(alice.id, exerciseId);
    const res = await request(app)
      .delete(`/api/goals/${lastInsertRowid}`)
      .set("Cookie", authCookie(bob));
    expect(res.status).toBe(404);
  });
});
