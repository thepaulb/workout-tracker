const BASE = "/api";

export async function getSessions() {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function getSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function createSession(session) {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}
