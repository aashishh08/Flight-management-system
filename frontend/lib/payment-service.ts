const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export async function getPayments(user_id: string) {
  const res = await fetch(`${API_BASE}/saved-payments?user_id=${user_id}`);
  if (!res.ok) throw new Error("Failed to fetch payments");
  return res.json();
}

export async function addPayment(user_id: string, data: any) {
  const res = await fetch(`${API_BASE}/saved-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, ...data }),
  });
  if (!res.ok) throw new Error("Failed to add payment");
  return res.json();
}

export async function deletePayment(id: string, user_id: string) {
  const res = await fetch(`${API_BASE}/saved-payments`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, user_id }),
  });
  if (!res.ok) throw new Error("Failed to delete payment");
  return res.json();
}
