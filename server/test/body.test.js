import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db, seedUser, authCookie } from "./helpers.js";

let user, cookie;
beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
});

describe("POST /api/body", () => {
  it("creates a new entry", async () => {
    const res = await request(app)
      .post("/api/body")
      .set("Cookie", cookie)
      .send({ date: "2026-01-01", bodyweight_kg: 82.5, body_fat_pct: 15 });
    expect(res.status).toBe(201);
    const row = db.prepare("SELECT * FROM body_composition WHERE id = ?").get(res.body.id);
    expect(row).toMatchObject({ bodyweight_kg: 82.5, body_fat_pct: 15 });
  });

  it("upserts when the same user logs the same date again", async () => {
    await request(app)
      .post("/api/body")
      .set("Cookie", cookie)
      .send({ date: "2026-01-01", bodyweight_kg: 82 });
    const res = await request(app)
      .post("/api/body")
      .set("Cookie", cookie)
      .send({ date: "2026-01-01", bodyweight_kg: 81 });

    expect(res.body.updated).toBe(true);
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM body_composition WHERE user_id = ? AND date = ?")
      .get(user.id, "2026-01-01").n;
    expect(count).toBe(1); // updated, not duplicated
    const row = db
      .prepare("SELECT bodyweight_kg FROM body_composition WHERE id = ?")
      .get(res.body.id);
    expect(row.bodyweight_kg).toBe(81);
  });

  it("requires date and bodyweight_kg (400)", async () => {
    const res = await request(app)
      .post("/api/body")
      .set("Cookie", cookie)
      .send({ date: "2026-01-01" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/body", () => {
  it("returns the user's entries ordered by date ascending", async () => {
    await request(app).post("/api/body").set("Cookie", cookie).send({ date: "2026-02-01", bodyweight_kg: 80 });
    await request(app).post("/api/body").set("Cookie", cookie).send({ date: "2026-01-01", bodyweight_kg: 82 });
    const res = await request(app).get("/api/body").set("Cookie", cookie);
    expect(res.body.map((r) => r.date)).toEqual(["2026-01-01", "2026-02-01"]);
  });
});

describe("DELETE /api/body/:id", () => {
  it("deletes the user's own entry", async () => {
    const create = await request(app)
      .post("/api/body")
      .set("Cookie", cookie)
      .send({ date: "2026-01-01", bodyweight_kg: 80 });
    const res = await request(app)
      .delete(`/api/body/${create.body.id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(db.prepare("SELECT id FROM body_composition WHERE id = ?").get(create.body.id)).toBeUndefined();
  });
});
