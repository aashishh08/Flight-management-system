import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, flightIds, passengers, contactEmail, contactPhone, seatClass } = body

    if (!userId || !flightIds || !passengers || !contactEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Generate booking reference
    const bookingReference = generateBookingReference()

    // Calculate total amount (simplified)
    const totalAmount = flightIds.length * passengers.length * 299.99

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        user_id: userId,
        total_amount: totalAmount,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        status: "confirmed",
      })
      .select()
      .single()

    if (bookingError) {
      throw bookingError
    }

    // Create passengers
    const { data: createdPassengers, error: passengersError } = await supabase
      .from("passengers")
      .insert(
        passengers.map((p: any) => ({
          booking_id: booking.id,
          first_name: p.first_name,
          last_name: p.last_name,
          date_of_birth: p.date_of_birth,
          passport_number: p.passport_number,
          nationality: p.nationality,
          passenger_type: p.passenger_type,
        })),
      )
      .select()

    if (passengersError) {
      throw passengersError
    }

    // Create flight bookings
    const flightBookings = []
    for (const flightId of flightIds) {
      for (const passenger of createdPassengers) {
        flightBookings.push({
          booking_id: booking.id,
          flight_id: flightId,
          passenger_id: passenger.id,
          seat_class: seatClass,
          price: 299.99,
        })
      }
    }

    const { error: flightBookingsError } = await supabase.from("flight_bookings").insert(flightBookings)

    if (flightBookingsError) {
      throw flightBookingsError
    }

    return NextResponse.json({ bookingId: booking.id })
  } catch (error) {
    console.error("Booking creation error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

function generateBookingReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
