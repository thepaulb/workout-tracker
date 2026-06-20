import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { seedUser, authCookie } from "./helpers.js";

describe("test harness", () => {
  it("serves the public health endpoint", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("rejects protected routes without a cookie", async () => {
    const res = await request(app).get("/api/sessions");
    expect(res.status).toBe(401);
  });

  it("accepts a seeded user's auth cookie", async () => {
    const user = seedUser("paul");
    const res = await request(app)
      .get("/api/sessions")
      .set("Cookie", authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
