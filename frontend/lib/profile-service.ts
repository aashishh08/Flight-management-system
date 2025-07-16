const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export async function getProfile(user_id: string) {
  const res = await fetch(`${API_BASE}/user-profile?user_id=${user_id}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function updateProfile(user_id: string, data: any) {
  const res = await fetch(`${API_BASE}/user-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, ...data }),
  });
  if (!res.ok) throw new Error("Failed to update user profile");
  return res.json();
}

export async function createProfile(user_id: string, data: any) {
  const res = await fetch(`${API_BASE}/user-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, ...data }),
  });
  if (!res.ok) throw new Error("Failed to create user profile");
  return res.json();
}
