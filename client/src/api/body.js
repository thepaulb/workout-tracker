const BASE = "/api";

export async function getBodyComposition() {
  const res = await fetch(`${BASE}/body`);
  if (!res.ok) throw new Error("Failed to fetch body composition");
  return res.json();
}

export async function addEntry(entry) {
  const res = await fetch(`${BASE}/body`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("Failed to save entry");
  return res.json();
}

export async function deleteEntry(id) {
  const res = await fetch(`${BASE}/body/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete entry");
  return res.json();
}
