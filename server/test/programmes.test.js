import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db, seedUser, authCookie } from "./helpers.js";

let cookie;
beforeEach(() => {
  cookie = authCookie(seedUser("paul"));
});

describe("GET /api/programmes", () => {
  it("lists programmes ordered by name", async () => {
    db.prepare("INSERT INTO programmes (name) VALUES (?)").run("Wendler");
    db.prepare("INSERT INTO programmes (name) VALUES (?)").run("5x5");
    const res = await request(app).get("/api/programmes").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.name)).toEqual(["5x5", "Wendler"]);
  });
});

describe("POST /api/programmes", () => {
  it("creates a new programme", async () => {
    const res = await request(app)
      .post("/api/programmes")
      .set("Cookie", cookie)
      .send({ name: "5x5" });
    expect(res.status).toBe(201);
    expect(db.prepare("SELECT name FROM programmes WHERE id = ?").get(res.body.id).name).toBe("5x5");
  });

  it("returns the existing id when the name is already taken (no duplicate)", async () => {
    const existing = db.prepare("INSERT INTO programmes (name) VALUES (?)").run("5x5").lastInsertRowid;
    const res = await request(app)
      .post("/api/programmes")
      .set("Cookie", cookie)
      .send({ name: "5x5" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(Number(existing));
    expect(db.prepare("SELECT COUNT(*) AS n FROM programmes").get().n).toBe(1);
  });

  it("requires a name (400)", async () => {
    const res = await request(app)
      .post("/api/programmes")
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});
