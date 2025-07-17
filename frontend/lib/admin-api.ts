const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export async function getAdminMetrics() {
  const res = await fetch(`${API_BASE}/admin/metrics`);
  if (!res.ok) throw new Error("Failed to fetch admin metrics");
  return res.json();
}

export async function getAdminBookings(params?: {
  page?: number;
  pageSize?: number;
  bookingId?: string;
  userEmail?: string;
  flightNumber?: string;
}) {
  const url = new URL(`${API_BASE}/admin/bookings`);
  if (params) {
    if (params.page) url.searchParams.set("page", params.page.toString());
    if (params.pageSize)
      url.searchParams.set("pageSize", params.pageSize.toString());
    if (params.bookingId) url.searchParams.set("bookingId", params.bookingId);
    if (params.userEmail) url.searchParams.set("userEmail", params.userEmail);
    if (params.flightNumber)
      url.searchParams.set("flightNumber", params.flightNumber);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}

export async function getAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  email?: string;
  name?: string;
}) {
  const url = new URL(`${API_BASE}/admin/users`);
  if (params) {
    if (params.page) url.searchParams.set("page", params.page.toString());
    if (params.pageSize)
      url.searchParams.set("pageSize", params.pageSize.toString());
    if (params.email) url.searchParams.set("email", params.email);
    if (params.name) url.searchParams.set("name", params.name);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function getAdminFlights(params?: {
  departureFrom?: string;
  departureTo?: string;
  page?: number;
  pageSize?: number;
  flightNumber?: string;
}) {
  const url = new URL(`${API_BASE}/admin/flights`);
  if (params) {
    if (params.departureFrom)
      url.searchParams.set("departureFrom", params.departureFrom);
    if (params.departureTo)
      url.searchParams.set("departureTo", params.departureTo);
    if (params.page) url.searchParams.set("page", params.page.toString());
    if (params.pageSize)
      url.searchParams.set("pageSize", params.pageSize.toString());
    if (params.flightNumber)
      url.searchParams.set("flightNumber", params.flightNumber);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch flights");
  return res.json();
}

export async function getAdminFlightsWithStatus(params?: {
  flightNumber?: string;
  departureFrom?: string;
  departureTo?: string;
}) {
  const url = new URL(`${API_BASE}/admin/flights-with-status`);
  if (params) {
    if (params.flightNumber)
      url.searchParams.set("flightNumber", params.flightNumber);
    if (params.departureFrom)
      url.searchParams.set("departureFrom", params.departureFrom);
    if (params.departureTo)
      url.searchParams.set("departureTo", params.departureTo);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch flights with status");
  return res.json();
}

export async function updateFlightStatus(
  flightId: string,
  status: string,
  updated_by?: string,
  note?: string
) {
  const res = await fetch(`${API_BASE}/admin/flights/${flightId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, updated_by, note }),
  });
  if (!res.ok) throw new Error("Failed to update flight status");
  return res.json();
}

export async function getFlightStatusHistory(flightId: string) {
  const res = await fetch(
    `${API_BASE}/admin/flights/${flightId}/status-history`
  );
  if (!res.ok) throw new Error("Failed to fetch flight status history");
  return res.json();
}

export async function getBookingsTrend() {
  const res = await fetch(`${API_BASE}/admin/stats/bookings-trend`);
  if (!res.ok) throw new Error("Failed to fetch bookings trend");
  return res.json();
}

export async function getBookingsByAirline() {
  const res = await fetch(`${API_BASE}/admin/stats/bookings-by-airline`);
  if (!res.ok) throw new Error("Failed to fetch bookings by airline");
  return res.json();
}

export async function getBookingStatusDistribution() {
  const res = await fetch(
    `${API_BASE}/admin/stats/booking-status-distribution`
  );
  if (!res.ok) throw new Error("Failed to fetch booking status distribution");
  return res.json();
}
