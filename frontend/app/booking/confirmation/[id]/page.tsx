"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Download,
  Mail,
  Phone,
  Clock,
  Plane,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Booking } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// @ts-ignore
import uniqBy from "lodash/uniqBy";
import { getPayments } from "@/lib/payment-service";

// Helper: deep clone
function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export default function BookingConfirmationPage() {
  // All hooks at the top
  const params = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(
    null
  );
  const [editPassenger, setEditPassenger] = useState<any>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editContact, setEditContact] = useState({ email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState({ email: "", phone: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [addingPassenger, setAddingPassenger] = useState(false);
  const [newPassenger, setNewPassenger] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    passport_number: "",
    nationality: "",
    passenger_type: "adult",
  });
  const [addPassengerError, setAddPassengerError] = useState("");
  const [savingAddPassenger, setSavingAddPassenger] = useState(false);
  const [seatDropdown, setSeatDropdown] = useState<{
    [passengerId: string]: boolean;
  }>({});
  const [availableSeats, setAvailableSeats] = useState<{
    [passengerId: string]: string[];
  }>({});
  const [savingSeat, setSavingSeat] = useState<{
    [passengerId: string]: boolean;
  }>({});
  const [showFlightChange, setShowFlightChange] = useState(false);
  const [availableFlights, setAvailableFlights] = useState<any[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [savingFlight, setSavingFlight] = useState(false);
  const [flightChangeError, setFlightChangeError] = useState("");

  // Add state for edit booking modal
  const [showEditModal, setShowEditModal] = useState(false);

  // Modal form state
  const [modalContact, setModalContact] = useState({ email: "", phone: "" });
  const [modalPassengers, setModalPassengers] = useState<any[]>([]);
  const [modalSeatClass, setModalSeatClass] = useState("economy");
  const [modalFlightId, setModalFlightId] = useState<string | null>(null);
  const [modalAvailableFlights, setModalAvailableFlights] = useState<any[]>([]);
  const [modalAvailableSeats, setModalAvailableSeats] = useState<{
    [passengerId: string]: string[];
  }>({});
  const [modalError, setModalError] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // Add state to store original names for edit validation
  const [originalPassengerNames, setOriginalPassengerNames] = useState<
    { first_name: string; last_name: string }[]
  >([]);

  // Add state for name edit errors
  const [nameEditErrors, setNameEditErrors] = useState<{
    [key: string]: string;
  }>({});

  // Add state for updating
  const [updating, setUpdating] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [priceDifference, setPriceDifference] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const bookingId = params.id as string;
  const [flightId, setFlightId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [skipPriceCheck, setSkipPriceCheck] = useState(false);

  // Group flight_bookings by unique flight
  const uniqueFlights =
    booking && booking.flight_bookings
      ? uniqBy(
          booking.flight_bookings.map((fb: any) => fb.flight),
          (f: any) => f.id
        )
      : [];

  // Map flightId to all flight_bookings for that flight
  const flightIdToBookings: Record<string, any[]> =
    booking && booking.flight_bookings
      ? booking.flight_bookings.reduce(
          (acc: Record<string, any[]>, fb: any) => {
            if (!acc[fb.flight.id]) acc[fb.flight.id] = [];
            acc[fb.flight.id].push(fb);
            return acc;
          },
          {} as Record<string, any[]>
        )
      : {};

  // Fetch booking and latest status on load
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            passengers(*),
            flight_bookings(
              *,
              flight:flights(
                *,
                airline:airlines(*),
                origin_airport:airports!flights_origin_airport_id_fkey(*),
                destination_airport:airports!flights_destination_airport_id_fkey(*)
              ),
              passenger:passengers(*)
            )
          `
          )
          .eq("id", bookingId)
          .single();

        if (error) throw error;

        setBooking(data);
        const fid = data?.flight_bookings?.[0]?.flight?.id;
        console.log("Fetched booking, flightId:", fid);
        setFlightId(fid);

        // Fetch latest status immediately after setting flight ID
        if (fid) {
          const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
          console.log("Fetching latest status for flightId:", fid);
          try {
            const res = await fetch(`${API_BASE}/flights/${fid}/latest-status`);
            if (res.ok) {
              const statusData = await res.json();
              console.log("Latest status API response:", statusData);
              if (statusData && statusData.status) {
                console.log(
                  "Setting initial liveStatus to:",
                  statusData.status
                );
                setLiveStatus(statusData.status);
              }
            } else {
              console.log("Latest status API error:", res.status);
            }
          } catch (err) {
            console.log("Latest status API fetch error:", err);
          }
        }
      } catch (err) {
        setError("Failed to load booking details");
        console.error("Booking fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) fetchBooking();
  }, [bookingId]);

  // SSE for real-time status updates - Fixed version
  useEffect(() => {
    if (!flightId) {
      console.log("No flightId, skipping SSE setup");
      return;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
    const url = `${API_BASE}/flight-status?flightId=${flightId}`;

    console.log("Setting up SSE connection to:", url);

    const es = new EventSource(url);

    es.onopen = () => {
      console.log("SSE connection opened");
    };

    es.onmessage = (event) => {
      console.log("SSE message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed SSE data:", data);
        if (data?.status) {
          console.log("Updating liveStatus from SSE:", data.status);
          setLiveStatus(data.status);
        }
      } catch (parseError) {
        console.error("Error parsing SSE data:", parseError);
      }
    };

    es.onerror = (error) => {
      console.error("SSE error:", error);
      es.close();
    };

    return () => {
      console.log("Cleaning up SSE connection");
      es.close();
    };
  }, [flightId]);

  // Fetch userId for payment-service (if using auth context, replace this logic)
  useEffect(() => {
    // Try to get userId from booking (if available)
    if (booking && booking.user_id) setUserId(booking.user_id);
  }, [booking]);

  // Open modal and prefill data
  const openEditModal = async () => {
    if (!booking) return;

    setModalContact({
      email: booking.contact_email || "",
      phone: booking.contact_phone || "",
    });
    setModalPassengers(deepClone(booking.passengers || []));
    setOriginalPassengerNames(
      (booking.passengers || []).map((p: any) => ({
        first_name: p.first_name,
        last_name: p.last_name,
      }))
    );
    setModalFlightId(booking.flight_bookings?.[0]?.flight?.id || null);

    // Fetch available flights for the same route
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      const origin = booking.flight_bookings?.[0]?.flight?.origin_airport?.code;
      const destination =
        booking.flight_bookings?.[0]?.flight?.destination_airport?.code;
      const departureDate =
        booking.flight_bookings?.[0]?.flight?.departure_time?.split("T")[0];

      const res = await fetch(
        `${API_BASE}/flights/search?origin=${origin}&destination=${destination}&departureDate=${departureDate}`
      );
      const data = await res.json();
      setModalAvailableFlights(data);
    } catch {
      setModalAvailableFlights([]);
    }

    setShowEditModal(true);
  };

  // Fetch available seats for a passenger
  const fetchModalAvailableSeats = async (
    flightId: string,
    seatClass: string,
    passengerId: string
  ) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      // Fetch available seats for this passenger
      const res = await fetch(
        `${API_BASE}/flights/${flightId}/available-seats?seat_class=${seatClass}`
      );
      const data = await res.json();

      // Fetch all possible seats for this flight/class
      const allRes = await fetch(
        `${API_BASE}/flights/${flightId}/all-seats?seat_class=${seatClass}`
      );
      const allSeats = await allRes.json();

      setModalAvailableSeats((prev) => ({
        ...prev,
        [passengerId]: data,
        __all__: allSeats,
      }));
    } catch {
      setModalAvailableSeats((prev) => ({ ...prev, [passengerId]: [] }));
    }
  };

  // Add/remove passenger in modal
  const addModalPassenger = () => {
    setModalPassengers((prev) => [
      ...prev,
      {
        first_name: "",
        last_name: "",
        date_of_birth: "",
        passport_number: "",
        nationality: "",
        passenger_type: "adult",
      },
    ]);
  };

  const removeModalPassenger = (idx: number) => {
    setModalPassengers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save all changes from modal
  const saveModalEdits = async () => {
    setModalSaving(true);
    setUpdating(true);
    setModalError("");

    // Validate only contact info
    if (!modalContact.email || !validateEmail(modalContact.email)) {
      setModalError("Invalid email");
      setModalSaving(false);
      return;
    }

    if (!modalContact.phone || !validatePhone(modalContact.phone)) {
      setModalError("Invalid phone");
      setModalSaving(false);
      return;
    }

    // Remove all passenger field validations
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

      // Save contact info and passenger details
      await fetch(`${API_BASE}/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_email: modalContact.email,
          contact_phone: modalContact.phone,
          passengers: modalPassengers.map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            passport_number: p.passport_number,
            nationality: p.nationality,
          })),
        }),
      });

      // Save seat class for each passenger
      for (const p of modalPassengers) {
        if (p.seat_class) {
          await fetch(`${API_BASE}/bookings/${bookingId}/change-seat-class`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              passenger_id: p.id,
              seat_class: p.seat_class,
            }),
          });
        }
      }

      // Save seat numbers
      for (const p of modalPassengers) {
        if (p.seat_number) {
          await fetch(`${API_BASE}/bookings/${bookingId}/change-seat-number`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              passenger_id: p.id,
              seat_number: p.seat_number,
            }),
          });
        }
      }

      // Save flight change
      if (
        modalFlightId &&
        booking &&
        modalFlightId !== booking.flight_bookings?.[0]?.flight?.id
      ) {
        await fetch(`${API_BASE}/bookings/${bookingId}/change-flight`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_flight_id: modalFlightId }),
        });
      }

      setShowEditModal(false);

      // Call backend to send confirmation email with latest data
      setEmailSending(true);
      const emailRes = await fetch(
        `${API_BASE}/bookings/${bookingId}/send-confirmation`,
        { method: "POST" }
      );
      if (!emailRes.ok) throw new Error("Failed to send confirmation email");

      // Re-fetch booking and update state
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          passengers(*),
          flight_bookings(
            *,
            flight:flights(
              *,
              airline:airlines(*),
              origin_airport:airports!flights_origin_airport_id_fkey(*),
              destination_airport:airports!flights_destination_airport_id_fkey(*)
            ),
            passenger:passengers(*)
          )
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data);

      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 3000);

      toast({
        title: "Booking updated!",
        description:
          "Your changes have been saved and a confirmation email with the new details has been sent.",
      });
    } catch (err: any) {
      setModalError("Failed to save changes: " + err.message);
      toast({
        title: "Update failed",
        description:
          err.message || "An error occurred while updating your booking.",
        variant: "destructive",
      });
    } finally {
      setModalSaving(false);
      setEmailSending(false);
      setUpdating(false);
    }
  };

  // Handle payment success and continue save
  useEffect(() => {
    if (paymentSuccess && showPaymentModal) {
      setShowPaymentModal(false);
      setPaymentSuccess(false);
      setTimeout(() => {
        saveModalEdits();
      }, 0);
    }
  }, [paymentSuccess, showPaymentModal]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading booking details...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>{error || "Booking not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-6 text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                This booking has been cancelled
              </h2>
              <p className="text-muted-foreground">
                You can no longer modify or manage this booking.
              </p>
            </div>
            {/* Booking Reference */}
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  Booking Reference
                </div>
                <div className="text-3xl font-bold tracking-wider">
                  {booking.booking_reference}
                </div>
              </CardContent>
            </Card>
            {/* Flight Details (read-only, no status) */}
            {booking.flight_bookings && booking.flight_bookings.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plane className="w-5 h-5" />
                    <span>Flight Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uniqBy(
                    booking.flight_bookings.map((fb: any) => fb.flight),
                    (f: any) => f.id
                  ).map((flight: any, idx: number) => (
                    <div key={flight.id} className="mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">
                            {flight.airline.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {flight.flight_number}
                          </div>
                        </div>
                        {/* No status badge here */}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Departure
                          </div>
                          <div className="font-semibold">
                            {flight.origin_airport.code}
                          </div>
                          <div className="text-sm">
                            {flight.origin_airport.city}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(flight.departure_time), "PPP")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(flight.departure_time), "HH:mm")}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Arrival
                          </div>
                          <div className="font-semibold">
                            {flight.destination_airport.code}
                          </div>
                          <div className="text-sm">
                            {flight.destination_airport.city}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(flight.arrival_time), "PPP")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(flight.arrival_time), "HH:mm")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {Math.floor(flight.duration / 60)}h{" "}
                            {flight.duration % 60}m
                          </span>
                        </div>
                        <div>{flight.aircraft?.model || "-"}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {/* Passenger Details (read-only) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Passenger Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Passenger</th>
                        {uniqBy(
                          booking.flight_bookings.map((fb: any) => fb.flight),
                          (f: any) => f.id
                        ).length === 1 ? (
                          <th className="border px-2 py-1">
                            {
                              uniqBy(
                                booking.flight_bookings.map(
                                  (fb: any) => fb.flight
                                ),
                                (f: any) => f.id
                              )[0].flight_number
                            }{" "}
                            <br />
                            Departure
                          </th>
                        ) : (
                          uniqBy(
                            booking.flight_bookings.map((fb: any) => fb.flight),
                            (f: any) => f.id
                          ).map((flight: any, idx: number) => (
                            <th key={flight.id} className="border px-2 py-1">
                              {flight.flight_number} <br />
                              {idx === 0 ? "Departure" : "Return"}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {booking.passengers.map((passenger: any) => (
                        <tr key={passenger.id}>
                          <td className="border px-2 py-1 font-medium">
                            {passenger.first_name} {passenger.last_name}
                            <div className="text-xs text-muted-foreground capitalize">
                              {passenger.passenger_type}
                            </div>
                          </td>
                          {uniqBy(
                            booking.flight_bookings.map((fb: any) => fb.flight),
                            (f: any) => f.id
                          ).length === 1 ? (
                            <td className="border px-2 py-1 text-center">
                              {(() => {
                                const flight = uniqBy(
                                  booking.flight_bookings.map(
                                    (fb: any) => fb.flight
                                  ),
                                  (f: any) => f.id
                                )[0];
                                const fb = booking.flight_bookings.find(
                                  (fb: any) =>
                                    fb.passenger.id === passenger.id &&
                                    fb.flight.id === flight.id
                                );
                                if (!fb) return "-";
                                return (
                                  <>
                                    <Badge variant="outline">
                                      {fb.seat_class}
                                    </Badge>
                                    {fb.seat_number && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Seat: {fb.seat_number}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </td>
                          ) : (
                            uniqBy(
                              booking.flight_bookings.map(
                                (fb: any) => fb.flight
                              ),
                              (f: any) => f.id
                            ).map((flight: any) => {
                              const fb = booking.flight_bookings.find(
                                (fb: any) =>
                                  fb.passenger.id === passenger.id &&
                                  fb.flight.id === flight.id
                              );
                              if (!fb)
                                return (
                                  <td
                                    key={flight.id}
                                    className="border px-2 py-1 text-center text-muted-foreground"
                                  >
                                    -
                                  </td>
                                );
                              return (
                                <td
                                  key={flight.id}
                                  className="border px-2 py-1 text-center"
                                >
                                  <Badge variant="outline">
                                    {fb.seat_class}
                                  </Badge>
                                  {fb.seat_number && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Seat: {fb.seat_number}
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {/* Contact Information (read-only) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.contact_email}</span>
                  <Phone className="w-4 h-4 text-muted-foreground ml-4" />
                  <span>{booking.contact_phone}</span>
                </div>
              </CardContent>
            </Card>
            {/* Booking Summary (read-only) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Booking Date</span>
                  <span>{format(new Date(booking.booking_date), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge
                    variant={
                      booking.status === "confirmed" ? "default" : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>${booking.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!booking || !booking.flight_bookings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground">
          Booking not found or still loading...
        </div>
      </div>
    );
  }

  const flight = booking.flight_bookings[0]?.flight;

  const handleCancelBooking = async () => {
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    setCancelling(true);
    setCancelError(null);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to cancel booking");

      setCancelled(true);
      window.location.reload();
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  // Handler to resend confirmation email
  const handleResendEmail = async () => {
    setEmailSending(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(
        `${API_BASE}/bookings/${bookingId}/send-confirmation`,
        {
          method: "POST",
        }
      );

      if (!res.ok) throw new Error("Failed to send confirmation email");

      toast({
        title: "Confirmation email sent!",
        description: `A new confirmation email has been sent to ${booking.contact_email}.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to send email",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  // Handler to download e-ticket PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/pdf`, {
        method: "GET",
      });

      if (!res.ok) throw new Error("Failed to download e-ticket");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-${booking.booking_reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "E-Ticket downloaded!",
        description: "Check your downloads for the PDF.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to download e-ticket",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Validation helpers
  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone: string) {
    return /^[+]?\d[\d\s-]{7,}$/.test(phone);
  }

  // Helper to count character differences
  function countCharDiff(a: string, b: string) {
    if (a.length !== b.length)
      return (
        Math.abs(a.length - b.length) +
        Math.min(a.length, b.length) -
        [...a].filter((c, i) => b[i] === c).length
      );

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff;
  }

  // Get the current status to display - prioritize liveStatus over flight.status
  const getCurrentStatus = () => {
    console.log(
      "getCurrentStatus called - liveStatus:",
      liveStatus,
      "flight.status:",
      flight?.status
    );
    return liveStatus || flight?.status || "unknown";
  };

  // Helper to get seat price for a given class
  function getSeatPrice(flight: any, seatClass: string) {
    switch (seatClass) {
      case "economy":
        return flight.economy_price ?? flight.base_price;
      case "premium_economy":
        return flight.premium_price ?? flight.base_price;
      case "business":
        return flight.business_price ?? flight.base_price;
      case "first_class":
        return flight.first_price ?? flight.base_price;
      default:
        return flight.base_price;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground">
              Your flight has been successfully booked. Confirmation details
              have been sent to your email.
            </p>
          </div>

          {/* Booking Reference */}
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <div className="text-sm text-muted-foreground mb-2">
                Booking Reference
              </div>
              <div className="text-3xl font-bold tracking-wider">
                {booking.booking_reference}
              </div>
            </CardContent>
          </Card>

          {updating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
              <span className="ml-4 text-lg font-semibold text-white">
                Updating booking...
              </span>
            </div>
          )}

          {showSuccessBanner && (
            <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
              <div className="bg-green-600 text-white px-6 py-3 rounded-b shadow-lg text-lg font-semibold mt-0">
                Booking updated successfully.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flight Details - show unique flights only */}
            {uniqueFlights.length === 1 ? (
              <Card key={uniqueFlights[0].id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plane className="w-5 h-5" />
                    <span>Flight Details (Departure)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uniqueFlights[0] && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">
                            {uniqueFlights[0].airline.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {uniqueFlights[0].flight_number}
                          </div>
                        </div>
                        <Badge>{getCurrentStatus()}</Badge>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Departure
                          </div>
                          <div className="font-semibold">
                            {uniqueFlights[0].origin_airport.code}
                          </div>
                          <div className="text-sm">
                            {uniqueFlights[0].origin_airport.city}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(uniqueFlights[0].departure_time),
                              "PPP"
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(uniqueFlights[0].departure_time),
                              "HH:mm"
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Arrival
                          </div>
                          <div className="font-semibold">
                            {uniqueFlights[0].destination_airport.code}
                          </div>
                          <div className="text-sm">
                            {uniqueFlights[0].destination_airport.city}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(uniqueFlights[0].arrival_time),
                              "PPP"
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(uniqueFlights[0].arrival_time),
                              "HH:mm"
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {Math.floor(uniqueFlights[0].duration / 60)}h{" "}
                            {uniqueFlights[0].duration % 60}m
                          </span>
                        </div>
                        <div>{uniqueFlights[0].aircraft?.model || "-"}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              uniqueFlights.map((flight: any, idx: number) => (
                <Card key={flight.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Plane className="w-5 h-5" />
                      <span>
                        Flight Details {idx === 0 ? "(Departure)" : "(Return)"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {flight && (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {flight.airline.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {flight.flight_number}
                            </div>
                          </div>
                          <Badge>{flight.status}</Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Departure
                            </div>
                            <div className="font-semibold">
                              {flight.origin_airport.code}
                            </div>
                            <div className="text-sm">
                              {flight.origin_airport.city}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(flight.departure_time), "PPP")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(flight.departure_time), "HH:mm")}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Arrival
                            </div>
                            <div className="font-semibold">
                              {flight.destination_airport.code}
                            </div>
                            <div className="text-sm">
                              {flight.destination_airport.city}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(flight.arrival_time), "PPP")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(flight.arrival_time), "HH:mm")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {Math.floor(flight.duration / 60)}h{" "}
                              {flight.duration % 60}m
                            </span>
                          </div>
                          <div>{flight.aircraft?.model || "-"}</div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Are you sure you want to cancel this flight?"
                                )
                              )
                                return;
                              // Find a flight_booking for this flight
                              const fb = booking.flight_bookings.find(
                                (fb) => fb.flight.id === flight.id
                              );
                              if (!fb) return;
                              const API_BASE =
                                process.env.NEXT_PUBLIC_API_BASE ||
                                "http://localhost:4000";
                              await fetch(
                                `${API_BASE}/bookings/${booking.id}/cancel-flight/${fb.id}`,
                                { method: "POST" }
                              );
                              window.location.reload();
                            }}
                          >
                            Cancel Flight
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}

            {/* Passenger Details */}
            <Card>
              <CardHeader>
                <CardTitle>Passenger Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Passenger</th>
                        {uniqueFlights.length === 1 ? (
                          <th className="border px-2 py-1">
                            {uniqueFlights[0].flight_number} <br />
                            Departure
                          </th>
                        ) : (
                          uniqueFlights.map((flight: any, idx: number) => (
                            <th key={flight.id} className="border px-2 py-1">
                              {flight.flight_number} <br />
                              {idx === 0 ? "Departure" : "Return"}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {booking.passengers.map((passenger) => (
                        <tr key={passenger.id}>
                          <td className="border px-2 py-1 font-medium">
                            {passenger.first_name} {passenger.last_name}
                            <div className="text-xs text-muted-foreground capitalize">
                              {passenger.passenger_type}
                            </div>
                          </td>
                          {uniqueFlights.length === 1 ? (
                            <td className="border px-2 py-1 text-center">
                              {(() => {
                                // Find the flight_booking for this passenger and this flight
                                const fb = booking.flight_bookings.find(
                                  (fb) =>
                                    fb.passenger.id === passenger.id &&
                                    fb.flight.id === uniqueFlights[0].id
                                );
                                if (!fb) return "-";
                                return (
                                  <>
                                    <Badge variant="outline">
                                      {fb.seat_class}
                                    </Badge>
                                    {fb.seat_number && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Seat: {fb.seat_number}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </td>
                          ) : (
                            uniqueFlights.map((flight: any) => {
                              // Find the flight_booking for this passenger and this flight
                              const fb = booking.flight_bookings.find(
                                (fb) =>
                                  fb.passenger.id === passenger.id &&
                                  fb.flight.id === flight.id
                              );
                              if (!fb)
                                return (
                                  <td
                                    key={flight.id}
                                    className="border px-2 py-1 text-center text-muted-foreground"
                                  >
                                    -
                                  </td>
                                );
                              return (
                                <td
                                  key={flight.id}
                                  className="border px-2 py-1 text-center"
                                >
                                  <Badge variant="outline">
                                    {fb.seat_class}
                                  </Badge>
                                  {fb.seat_number && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Seat: {fb.seat_number}
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.contact_email}</span>
                  <Phone className="w-4 h-4 text-muted-foreground ml-4" />
                  <span>{booking.contact_phone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Booking Date</span>
                  <span>{format(new Date(booking.booking_date), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "cancelled"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>${booking.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              className="flex-1"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Downloading..." : "Download E-Ticket"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={handleResendEmail}
              disabled={emailSending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {emailSending ? "Sending..." : "Email Confirmation"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-destructive text-white"
              disabled={cancelling || cancelled}
              onClick={handleCancelBooking}
            >
              {cancelling
                ? "Cancelling..."
                : cancelled
                ? "Cancelled"
                : "Cancel Booking"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={openEditModal}
            >
              Edit Booking
            </Button>
          </div>

          {cancelError && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}

          {/* Important Information */}
          <Alert className="mt-6">
            <AlertDescription>
              <strong>Important:</strong> Please arrive at the airport at least
              2 hours before domestic flights and 3 hours before international
              flights. Don't forget to bring a valid ID and any required travel
              documents.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Edit Booking Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl p-0 rounded-2xl shadow-2xl">
          <DialogHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur p-6 rounded-t-2xl border-b">
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] p-6">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                saveModalEdits();
              }}
            >
              {/* Contact Info */}
              <div>
                <Label>Email</Label>
                <Input
                  value={modalContact.email}
                  onChange={(e) =>
                    setModalContact((c) => ({ ...c, email: e.target.value }))
                  }
                  type="email"
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={modalContact.phone}
                  onChange={(e) =>
                    setModalContact((c) => ({ ...c, phone: e.target.value }))
                  }
                  type="tel"
                  required
                />
              </div>

              {/* Flight selection */}
              <div>
                <Label>Flight</Label>
                <div className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-700">
                  {(() => {
                    const f = modalAvailableFlights.find(
                      (f) => f.id === modalFlightId
                    );
                    return f
                      ? `${f.airline?.name || ""} ${f.flight_number} (${
                          f.origin_airport?.code || "?"
                        } → ${f.destination_airport?.code || "?"})`
                      : "Flight not found";
                  })()}
                </div>
              </div>

              {/* Passengers */}
              <div>
                <Label>Passengers</Label>
                {modalPassengers.map((p, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded p-3 mb-2 flex flex-col gap-2"
                  >
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          value={p.first_name}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const orig =
                              originalPassengerNames[idx]?.first_name || "";
                            const diff = countCharDiff(newValue, orig);
                            setModalPassengers((pass) =>
                              pass.map((x, i) =>
                                i === idx ? { ...x, first_name: newValue } : x
                              )
                            );
                            setNameEditErrors((prev) => ({
                              ...prev,
                              ["first_name_" + idx]:
                                diff > 2
                                  ? "You can only change up to 2 characters from the original name."
                                  : "",
                            }));
                          }}
                          placeholder="First Name"
                          required
                          className={
                            nameEditErrors["first_name_" + idx]
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }
                        />
                        {Boolean(nameEditErrors["first_name_" + idx]) && (
                          <span
                            style={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              cursor: "pointer",
                            }}
                            title={nameEditErrors["first_name_" + idx]}
                          >
                            <AlertTriangle size={16} color="#ef4444" />
                          </span>
                        )}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <Input
                          value={p.last_name}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const orig =
                              originalPassengerNames[idx]?.last_name || "";
                            const diff = countCharDiff(newValue, orig);
                            setModalPassengers((pass) =>
                              pass.map((x, i) =>
                                i === idx ? { ...x, last_name: newValue } : x
                              )
                            );
                            setNameEditErrors((prev) => ({
                              ...prev,
                              ["last_name_" + idx]:
                                diff > 2
                                  ? "You can only change up to 2 characters from the original name."
                                  : "",
                            }));
                          }}
                          placeholder="Last Name"
                          required
                          className={
                            nameEditErrors["last_name_" + idx]
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }
                        />
                        {Boolean(nameEditErrors["last_name_" + idx]) && (
                          <span
                            style={{
                              position: "absolute",
                              right: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              cursor: "pointer",
                            }}
                            title={nameEditErrors["last_name_" + idx]}
                          >
                            <AlertTriangle size={16} color="#ef4444" />
                          </span>
                        )}
                      </div>
                    </div>
                    <Input
                      value={p.date_of_birth}
                      onChange={(e) =>
                        setModalPassengers((pass) =>
                          pass.map((x, i) =>
                            i === idx
                              ? { ...x, date_of_birth: e.target.value }
                              : x
                          )
                        )
                      }
                      type="date"
                      placeholder="Date of Birth"
                      required
                    />
                    <Input
                      value={p.passport_number}
                      onChange={(e) =>
                        setModalPassengers((pass) =>
                          pass.map((x, i) =>
                            i === idx
                              ? { ...x, passport_number: e.target.value }
                              : x
                          )
                        )
                      }
                      placeholder="Passport Number"
                      required
                    />
                    {/* Nationality (read-only) */}
                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <div className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-700">
                        {p.nationality || "-"}
                      </div>
                    </div>
                    {/* Passenger type (read-only) */}
                    <div className="space-y-2">
                      <Label>Passenger Type</Label>
                      <div className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-700">
                        {p.passenger_type.charAt(0).toUpperCase() +
                          p.passenger_type.slice(1)}
                      </div>
                    </div>
                    {/* Seat class selection (editable) */}
                    <div>
                      <Label>Seat Class</Label>
                      <select
                        value={p.seat_class || "economy"}
                        onChange={(e) =>
                          setModalPassengers((pass) =>
                            pass.map((x, i) =>
                              i === idx
                                ? { ...x, seat_class: e.target.value }
                                : x
                            )
                          )
                        }
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="economy">Economy</option>
                        <option value="premium_economy">Premium Economy</option>
                        <option value="business">Business</option>
                        <option value="first_class">First Class</option>
                      </select>
                    </div>
                    {/* Seat number selection (editable) */}
                    <div>
                      <Label>Seat</Label>
                      <select
                        value={p.seat_number || ""}
                        onFocus={() =>
                          modalFlightId &&
                          fetchModalAvailableSeats(
                            modalFlightId,
                            p.seat_class || "economy",
                            p.id || String(idx)
                          )
                        }
                        onChange={(e) =>
                          setModalPassengers((pass) =>
                            pass.map((x, i) =>
                              i === idx
                                ? { ...x, seat_number: e.target.value }
                                : x
                            )
                          )
                        }
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">Select seat</option>
                        {/* Show all possible seats, marking taken ones as disabled */}
                        {(() => {
                          const available = new Set(
                            modalAvailableSeats[p.id || String(idx)] || []
                          );
                          // If __all__ is not set, fallback to available only
                          const seatList = Array.isArray(
                            modalAvailableSeats.__all__
                          )
                            ? modalAvailableSeats.__all__
                            : Array.from(available);

                          return seatList.map((seat) => {
                            const isAvailable = available.has(seat);
                            return (
                              <option
                                key={seat}
                                value={seat}
                                disabled={!isAvailable}
                              >
                                {seat}
                                {!isAvailable ? " (Taken)" : ""}
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                    {modalPassengers.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeModalPassenger(idx)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {modalError && (
                <div className="text-destructive text-xs mt-2">
                  {modalError}
                </div>
              )}

              <DialogFooter className="sticky bottom-0 z-10 bg-white/90 backdrop-blur p-4 rounded-b-2xl border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setUpdating(false);
                    setModalSaving(false);
                    setModalError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    modalSaving ||
                    Object.values(nameEditErrors).some((err) => err) ||
                    updating
                  }
                >
                  {modalSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-red-600">
              <AlertTriangle size={40} />
            </div>
            <div className="text-lg font-semibold">
              Are you sure you want to cancel this booking?
            </div>
            <div className="text-muted-foreground text-sm">
              This action cannot be undone. You will lose your reservation and
              any associated benefits.
            </div>
            {cancelError && (
              <div className="text-destructive text-sm">{cancelError}</div>
            )}
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
            >
              No, Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
