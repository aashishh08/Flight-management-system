import type { Booking, Passenger } from "./types";
import {
  createBooking,
  getUserBookings,
  getBookingByReference,
} from "./booking";

export class BookingService {
  async createBooking(
    flightIds: string[],
    passengers: Passenger[],
    contactEmail: string,
    contactPhone?: string,
    seatClass = "economy"
  ): Promise<string> {
    // You may need to pass userId from auth context if required
    // For now, assume userId is handled in createBooking
    return await createBooking(
      "",
      flightIds,
      passengers,
      contactEmail,
      contactPhone,
      seatClass
    );
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await getUserBookings(userId);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return await getBookingByReference(id);
  }
}

export const bookingService = new BookingService();
