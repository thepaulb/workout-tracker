import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { db, seedUser, authCookie } from "./helpers.js";

// A real bcrypt hash of "correct-horse" for login tests. Hashed once.
let HASH;
beforeAll(async () => {
  HASH = await bcrypt.hash("correct-horse", 12);
});

// Pull the value of the `token` cookie out of a Set-Cookie header array.
function tokenCookie(res) {
  const cookies = res.headers["set-cookie"] || [];
  return cookies.find((c) => c.startsWith("token="));
}

describe("POST /api/auth/register", () => {
  it("creates the first user and sets an httpOnly token cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "paul", password: "pw" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ username: "paul" });

    const cookie = tokenCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);

    const row = db.prepare("SELECT * FROM users WHERE username = ?").get("paul");
    expect(row).toBeTruthy();
    // Password is stored hashed, never in plain text.
    expect(row.password_hash).not.toBe("pw");
  });

  it("is closed once a user exists (403)", async () => {
    seedUser("existing");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "second", password: "pw" });
    expect(res.status).toBe(403);
  });

  it("requires both username and password (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "nopassword" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns the username and a cookie on valid credentials", async () => {
    seedUser("paul", HASH);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "paul", password: "correct-horse" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: "paul" });
    expect(tokenCookie(res)).toBeDefined();
  });

  it("rejects a wrong password (401) and sets no cookie", async () => {
    seedUser("paul", HASH);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "paul", password: "wrong" });
    expect(res.status).toBe(401);
    expect(tokenCookie(res)).toBeUndefined();
  });

  it("rejects an unknown user (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "pw" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the user for a valid token", async () => {
    const user = seedUser("paul");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: "paul" });
  });

  it("401s with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("401s with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "token=garbage");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the token cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const cookie = (res.headers["set-cookie"] || []).join(";");
    // Express clearCookie expires the cookie immediately.
    expect(cookie).toMatch(/token=;/);
  });
});

describe("POST /api/auth/create-user", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app)
      .post("/api/auth/create-user")
      .send({ username: "new", password: "pw" });
    expect(res.status).toBe(401);
  });

  it("lets an authed user create an additional account", async () => {
    const user = seedUser("paul");
    const res = await request(app)
      .post("/api/auth/create-user")
      .set("Cookie", authCookie(user))
      .send({ username: "second", password: "pw" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ username: "second" });
    expect(
      db.prepare("SELECT id FROM users WHERE username = ?").get("second"),
    ).toBeTruthy();
  });

  it("rejects a duplicate username (409)", async () => {
    const user = seedUser("paul");
    seedUser("taken");
    const res = await request(app)
      .post("/api/auth/create-user")
      .set("Cookie", authCookie(user))
      .send({ username: "taken", password: "pw" });
    expect(res.status).toBe(409);
  });
});

describe("requireAuth middleware (via a protected route)", () => {
  it("blocks an expired token", async () => {
    const user = seedUser("paul");
    const expired = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: -10,
    });
    const res = await request(app)
      .get("/api/sessions")
      .set("Cookie", `token=${expired}`);
    expect(res.status).toBe(401);
  });

  it("blocks a token signed with the wrong secret", async () => {
    const forged = jwt.sign({ id: 1, username: "paul" }, "not-the-secret");
    const res = await request(app)
      .get("/api/sessions")
      .set("Cookie", `token=${forged}`);
    expect(res.status).toBe(401);
  });
});
