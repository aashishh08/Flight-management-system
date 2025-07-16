import type { Booking, Passenger } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export async function createBooking(
  userId: string,
  flightIds: string[],
  passengers: Passenger[],
  contactEmail: string,
  contactPhone?: string,
  seatClass = "economy"
): Promise<string> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      flightIds,
      passengers,
      contactEmail,
      contactPhone,
      seatClass,
    }),
  });
  if (!res.ok) throw new Error("Failed to create booking");
  const data = await res.json();
  return data.bookingId;
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  // If you want to filter by userId, you can add a query param or implement in backend
  // For now, fetch all bookings for demo
  const res = await fetch(`${API_BASE}/bookings?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return await res.json();
}

export async function getBookingByReference(
  reference: string
): Promise<Booking | null> {
  // Assuming reference is the booking ID for now
  const res = await fetch(`${API_BASE}/bookings/${reference}`);
  if (!res.ok) return null;
  return await res.json();
}

function generateBookingReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
