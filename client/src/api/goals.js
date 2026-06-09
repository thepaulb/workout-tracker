const BASE = "/api";

export async function getGoals() {
  const res = await fetch(`${BASE}/goals`);
  if (!res.ok) throw new Error("Failed to fetch goals");
  return res.json();
}

export async function createGoal(goal) {
  const res = await fetch(`${BASE}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  return res.json();
}

export async function checkGoals(exercise_id) {
  const res = await fetch(`${BASE}/goals/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise_id }),
  });
  if (!res.ok) throw new Error("Failed to check goals");
  return res.json();
}

export async function deleteGoal(id) {
  const res = await fetch(`${BASE}/goals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete goal");
  return res.json();
}
