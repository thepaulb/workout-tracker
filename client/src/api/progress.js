const BASE = "/api";

export async function getPersonalBests() {
  const res = await fetch(`${BASE}/progress/bests`);
  if (!res.ok) throw new Error("Failed to fetch personal bests");
  return res.json();
}

export async function getVolume() {
  const res = await fetch(`${BASE}/sessions/stats/volume`);
  if (!res.ok) throw new Error("Failed to fetch volume");
  return res.json();
}

export async function getPRs() {
  const res = await fetch(`${BASE}/progress/prs`);
  if (!res.ok) throw new Error("Failed to fetch PRs");
  return res.json();
}
