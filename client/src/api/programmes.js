const BASE = "/api";

export async function getProgrammes() {
  const res = await fetch(`${BASE}/programmes`);
  if (!res.ok) throw new Error("Failed to fetch programmes");
  return res.json();
}

export async function createProgramme(name) {
  const res = await fetch(`${BASE}/programmes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create programme");
  return res.json();
}
