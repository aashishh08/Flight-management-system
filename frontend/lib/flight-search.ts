import type { Flight, SearchParams, Airport } from "./types";
import { cache } from "./indexdb";

const API_BASE = "http://localhost:3000/api";

// Helper to check flight status before booking
export async function checkFlightStatusBeforeBooking(
  flightIds: string[]
): Promise<{ id: string; status: string }[]> {
  // Always fetch latest flight data for each flightId
  const results = await Promise.all(
    flightIds.map(async (id) => {
      const res = await fetch(`${API_BASE}/flights/${id}`);
      if (!res.ok) return { id, status: "unknown" };
      const flight = await res.json();
      return { id, status: flight.status };
    })
  );
  return results;
}

// Always fetch latest flight data before booking
export async function getLatestFlightsForBooking(
  flightIds: string[]
): Promise<any[]> {
  return Promise.all(
    flightIds.map(async (id) => {
      const res = await fetch(`${API_BASE}/flights/${id}`);
      if (!res.ok) return null;
      return await res.json();
    })
  );
}

export async function searchFlights(params: SearchParams): Promise<Flight[]> {
  const url = new URL(`${API_BASE}/flights`);
  url.searchParams.set("origin", params.origin);
  url.searchParams.set("destination", params.destination);
  url.searchParams.set("departureDate", params.departureDate);
  // Optionally add more params if needed

  // IndexedDB cache key
  const cacheKey = `flights:${params.origin}:${params.destination}:${params.departureDate}`;
  // Try to get from cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    // Background refresh: fetch fresh data and update cache if changed
    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        // If data is different, update cache
        if (JSON.stringify(data) !== JSON.stringify(cached)) {
          await cache.set(cacheKey, data, 5);
        }
      })
      .catch(() => {});
    return cached;
  }

  // If not cached, fetch from APIfix h
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch flights");
  const data = await res.json();
  // Cache the result for 5 minutes
  await cache.set(cacheKey, data, 5);
  return data;
}

export async function getFlightById(id: string): Promise<Flight | null> {
  const res = await fetch(`${API_BASE}/flights/${id}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function getAirports(): Promise<Airport[]> {
  const cacheKey = "airports:list";
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
  const url = `${API_BASE}/airports`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch airports");
  const data = await res.json();
  await cache.set(cacheKey, data, 24 * 60); // 24 hours
  return data;
}
