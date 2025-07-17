import type { Flight, SearchParams, Airport } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

// Helper to check flight status before booking
export async function checkFlightStatusBeforeBooking(
  flightIds: string[]
): Promise<{ id: string; status: string }[]> {
  const res = await fetch(`${API_BASE}/flights/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flightIds }),
  });
  if (!res.ok) throw new Error("Failed to fetch flight statuses");
  return await res.json();
}

// Always fetch latest flight data before booking
export async function getLatestFlightsForBooking(
  flightIds: string[]
): Promise<any[]> {
  const res = await fetch(`${API_BASE}/flights/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flightIds }),
  });
  if (!res.ok) throw new Error("Failed to fetch flights");
  return await res.json();
}

export async function searchFlights(params: SearchParams): Promise<Flight[]> {
  const url = new URL(`${API_BASE}/flights/search`);
  url.searchParams.set("origin", params.origin);
  url.searchParams.set("destination", params.destination);
  url.searchParams.set("departureDate", params.departureDate);
  // Optionally add more params if needed
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch flights");
  return await res.json();
}

export async function getFlightById(id: string): Promise<Flight | null> {
  const res = await fetch(`${API_BASE}/flights/${id}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function getAirports(): Promise<Airport[]> {
  const res = await fetch(`${API_BASE}/airports`);
  if (!res.ok) throw new Error("Failed to fetch airports");
  return await res.json();
}
