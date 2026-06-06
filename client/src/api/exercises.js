const BASE = "/api";

export async function getExercises() {
  const res = await fetch(`${BASE}/exercises`);
  if (!res.ok) throw new Error("Failed to fetch exercises");
  return res.json();
}

export async function getExercise(id) {
  const res = await fetch(`${BASE}/exercises/${id}`);
  if (!res.ok) throw new Error("Failed to fetch exercise");
  return res.json();
}
