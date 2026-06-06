const BASE = "/api";

export async function createSet(set) {
  const res = await fetch(`${BASE}/sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(set),
  });
  if (!res.ok) throw new Error("Failed to create set");
  return res.json();
}

export async function deleteSet(id) {
  const res = await fetch(`${BASE}/sets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete set");
  return res.json();
}

export async function getLastSet(exerciseId) {
  const res = await fetch(`${BASE}/sets/last/${exerciseId}`);
  if (!res.ok) throw new Error("Failed to fetch last set");
  return res.json();
}
