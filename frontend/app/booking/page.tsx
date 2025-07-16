"use client";

import { useState, useEffect } from "react";
import { BookingForm } from "@/components/booking-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle } from "lucide-react";
import type { Passenger } from "@/lib/types";
import {
  getFlightById,
  checkFlightStatusBeforeBooking,
} from "@/lib/flight-search";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { createBooking } from "@/lib/booking";
import { useAuth } from "@/components/auth-provider";

export default function BookingPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [flight, setFlight] = useState(null);
  const [returnFlight, setReturnFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const passengerCount = {
    adults: Number.parseInt(searchParams.get("adults") || "1"),
    children: Number.parseInt(searchParams.get("children") || "0"),
    infants: Number.parseInt(searchParams.get("infants") || "0"),
  };

  // Get flightId and cabinClass from URL
  const flightId = searchParams.get("flightId");
  const returnFlightId = searchParams.get("returnFlightId");
  const cabinClass = searchParams.get("cabinClass") || "economy";

  useEffect(() => {
    async function fetchFlights() {
      if (!flightId) {
        setError("No flight selected. Please go back and select a flight.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const f = await getFlightById(flightId);
        setFlight(f);
        if (returnFlightId) {
          const rf = await getFlightById(returnFlightId);
          setReturnFlight(rf);
          if (!rf) {
            setError("Return flight not found.");
          }
        } else {
          setReturnFlight(null);
        }
        if (!f) {
          setError("Flight not found.");
        }
      } catch {
        setError("Failed to load flight details.");
      } finally {
        setLoading(false);
      }
    }
    fetchFlights();
  }, [flightId, returnFlightId]);

  const handleBookingSubmit = async (
    passengers: Passenger[],
    contactInfo: { email: string; phone: string }
  ) => {
    if (!user) {
      alert("You must be logged in to book a flight.");
      return;
    }
    if (!flight || (returnFlightId && !returnFlight)) {
      return;
    }
    try {
      const flightIds = returnFlight
        ? [flight.id, returnFlight.id]
        : [flight.id];
      // Check latest flight status before booking
      const statuses = await checkFlightStatusBeforeBooking(flightIds);
      const unavailable = statuses.filter((f) => f.status !== "scheduled");
      if (unavailable.length > 0) {
        alert(
          `Sorry, the following flights are not available for booking: ` +
            unavailable.map((f) => `${f.id} (${f.status})`).join(", ")
        );
        return;
      }
      const userId = user.id;
      const bookingId = await createBooking(
        userId,
        flightIds,
        passengers,
        contactInfo.email,
        contactInfo.phone,
        cabinClass
      );
      window.location.href = `/booking/confirmation/${bookingId}`;
    } catch (err: any) {
      alert("Booking failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading flight details...</div>
      </div>
    );
  }

  if (error || !flight || (returnFlightId && !returnFlight)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>{error || "Flight not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground mb-6">
              Your flight has been successfully booked. Your booking reference
              is:
            </p>
            <div className="text-3xl font-bold tracking-wider mb-6 p-4 bg-gray-100 rounded-lg">
              {bookingReference}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              A confirmation email has been sent to your email address with all
              the details.
            </p>
            <div className="space-y-3">
              <Button className="w-full">Download E-Ticket</Button>
              <Button variant="outline" className="w-full bg-transparent">
                View Booking Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/")}
              >
                Book Another Flight
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search Results
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Booking</h1>
            <p className="text-muted-foreground">
              Please provide passenger details to complete your flight booking
            </p>
          </div>

          <BookingForm
            flights={returnFlight ? [flight, returnFlight] : [flight]}
            passengerCount={passengerCount}
            onSubmit={handleBookingSubmit}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}
