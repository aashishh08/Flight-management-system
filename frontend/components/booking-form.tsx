"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Passenger, Flight } from "@/lib/types";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";
import {
  checkFlightStatusBeforeBooking,
  getLatestFlightsForBooking,
} from "@/lib/flight-search";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface BookingFormProps {
  flights: Flight[];
  passengerCount: { adults: number; children: number; infants: number };
  onSubmit: (
    passengers: Passenger[],
    contactInfo: { email: string; phone: string },
    paymentDetails?: {
      cardNumber: string;
      expiry: string;
      cvv: string;
      name: string;
    }
  ) => Promise<string | undefined>;
  loading?: boolean;
}

export function BookingForm({
  flights,
  passengerCount,
  onSubmit,
  loading,
}: BookingFormProps) {
  const [passengers, setPassengers] = useState<Passenger[]>(() => {
    const allPassengers: Passenger[] = [];

    // Add adults
    for (let i = 0; i < passengerCount.adults; i++) {
      allPassengers.push({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        passenger_type: "adult",
      });
    }

    // Add children
    for (let i = 0; i < passengerCount.children; i++) {
      allPassengers.push({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        passenger_type: "child",
      });
    }

    // Add infants
    for (let i = 0; i < passengerCount.infants; i++) {
      allPassengers.push({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        passenger_type: "infant",
      });
    }

    return allPassengers;
  });

  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
  });

  const [showPayment, setShowPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [savePayment, setSavePayment] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "fail">(
    "success"
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { user } = useAuth();
  const [savedCards, setSavedCards] = useState<any[]>([]);
  // New states for payment processing and result
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<"success" | "fail" | null>(
    null
  );
  const [selectedSavedCard, setSelectedSavedCard] = useState<any | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [latestFlightData, setLatestFlightData] = useState<Flight[] | null>(
    null
  );
  const [pendingPayment, setPendingPayment] = useState(false);
  const [showBookingErrorModal, setShowBookingErrorModal] = useState(false);
  const [bookingErrorMessage, setBookingErrorMessage] = useState("");
  const router = useRouter();

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

  useEffect(() => {
    if (showPayment && user?.id) {
      fetch(`${API_BASE}/saved-payments?user_id=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setSavedCards(data);
        });
    }
  }, [showPayment, user]);

  const updatePassenger = (
    index: number,
    field: keyof Passenger,
    value: string
  ) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPayment(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (
      !paymentDetails.cardNumber ||
      !paymentDetails.expiry ||
      !paymentDetails.cvv ||
      !paymentDetails.name
    ) {
      setPaymentError("Please fill in all payment details.");
      return;
    }
    // Show loading indicator
    setPaymentProcessing(true);
    setPaymentResult(null);
    // Check latest flight status before payment
    const flightIds = flights.map((f) => f.id);
    try {
      const statuses = await checkFlightStatusBeforeBooking(flightIds);
      const unavailable = statuses.filter((f) => f.status !== "scheduled");
      if (unavailable.length > 0) {
        setPaymentProcessing(false);
        setChangeMessage(
          "Sorry, one or more flights are no longer available: " +
            unavailable.map((f) => `${f.id} (${f.status})`).join(", ") +
            ". Please return to flight selection."
        );
        setShowChangeModal(true);
        return;
      }
      // Check latest seat availability and price
      const latestFlights = await getLatestFlightsForBooking(flightIds);
      setLatestFlightData(latestFlights);
      for (let i = 0; i < latestFlights.length; i++) {
        const latest = latestFlights[i];
        const original = flights.find((f) => f.id === latest.id);
        if (!latest) {
          setPaymentProcessing(false);
          setChangeMessage(
            `Could not verify flight ${flightIds[i]}. Please try again.`
          );
          setShowChangeModal(true);
          return;
        }
        // Check seat availability for selected class
        let available = 0;
        let requested = passengers.length;
        const url = new URL(window.location.href);
        const cabinClass = url.searchParams.get("cabinClass") || "economy";
        switch (cabinClass) {
          case "economy":
            available = latest.available_economy;
            break;
          case "premium_economy":
            available = latest.available_premium_economy;
            break;
          case "business":
            available = latest.available_business;
            break;
          case "first_class":
            available = latest.available_first_class;
            break;
          default:
            available = latest.available_economy;
        }
        if (available < requested) {
          setPaymentProcessing(false);
          setChangeMessage(
            `Not enough seats available on flight ${latest.flight_number} (${cabinClass}). Please review your booking.`
          );
          setShowChangeModal(true);
          return;
        }
        // Check price
        let latestPrice = latest.base_price;
        let originalPrice = original ? getClassPrice(original) : null;
        switch (cabinClass) {
          case "economy":
            latestPrice = latest.economy_price ?? latest.base_price;
            break;
          case "premium_economy":
            latestPrice = latest.premium_price ?? latest.base_price;
            break;
          case "business":
            latestPrice = latest.business_price ?? latest.base_price;
            break;
          case "first_class":
            latestPrice = latest.first_price ?? latest.base_price;
            break;
          default:
            latestPrice = latest.base_price;
        }
        if (originalPrice !== null && latestPrice !== originalPrice) {
          setPaymentProcessing(false);
          setChangeMessage(
            `Price for flight ${latest.flight_number} has changed from $${originalPrice} to $${latestPrice}. Please review and confirm to proceed.`
          );
          setShowChangeModal(true);
          setPendingPayment(true);
          return;
        }
      }
    } catch (err) {
      setPaymentProcessing(false);
      setChangeMessage(
        "Could not verify flight status or availability. Please try again."
      );
      setShowChangeModal(true);
      return;
    }
    // Simulate payment delay
    setTimeout(async () => {
      setPaymentProcessing(false);
      setPaymentResult(paymentOutcome);
      if (paymentOutcome === "fail") {
        setPaymentError(
          "Payment failed. Please try again or select 'Success' to test success flow."
        );
        return;
      }
      let maskedCard = undefined;
      if (savePayment && user?.id) {
        maskedCard = {
          cardNumber: `**** **** **** ${paymentDetails.cardNumber.slice(-4)}`,
          expiry: paymentDetails.expiry,
          cvv: "***",
          name: paymentDetails.name,
        };
        // Save to backend
        await fetch(`${API_BASE}/saved-payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            card_last4: paymentDetails.cardNumber.slice(-4),
            card_expiry: paymentDetails.expiry,
            card_name: paymentDetails.name,
          }),
        });
      }
      // Try to submit booking and redirect to confirmation
      try {
        const bookingId = await onSubmit(passengers, contactInfo, maskedCard);
        if (bookingId) {
          router.push(`/booking/confirmation/${bookingId}`);
        }
      } catch (err) {
        setShowBookingErrorModal(true);
        setBookingErrorMessage(
          err instanceof Error ? err.message : String(err)
        );
        setPaymentResult(null); // Don't show payment success
        return;
      }
    }, 2000); // 2 seconds delay
  };

  const isFormValid = () => {
    return (
      passengers.every((p) => p.first_name && p.last_name && p.date_of_birth) &&
      contactInfo.email &&
      contactInfo.phone
    );
  };

  // Helper to get the price for the selected class
  const getClassPrice = (flight: Flight) => {
    // Try to infer the class from the available price fields
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const cabinClass = url.searchParams.get("cabinClass") || "economy";
      switch (cabinClass) {
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
    return flight.base_price;
  };

  const totalPrice =
    flights.reduce((sum, flight) => sum + getClassPrice(flight), 0) *
    passengers.length;

  return (
    <form
      onSubmit={showPayment ? handlePayment : handleSubmit}
      className="space-y-6 relative"
    >
      {/* Payment processing overlay */}
      {paymentProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
            <svg
              className="animate-spin h-10 w-10 text-blue-600 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <div className="text-lg font-semibold">Processing Payment...</div>
          </div>
        </div>
      )}
      {/* Payment result overlay */}
      {paymentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
            {paymentResult === "success" ? (
              <>
                <svg
                  className="h-12 w-12 text-green-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="text-2xl font-bold mb-2">
                  Payment Successful!
                </div>
                <div className="text-gray-600 mb-4">
                  Your booking has been completed.
                </div>
                <Button
                  onClick={() => setPaymentResult(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <svg
                  className="h-12 w-12 text-red-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <div className="text-2xl font-bold mb-2">Payment Failed</div>
                <div className="text-gray-600 mb-4">
                  There was a problem processing your payment.
                </div>
                <Button
                  onClick={() => setPaymentResult(null)}
                  className="w-full"
                >
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Flight Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {flights.map((flight, index) => (
            <div key={flight.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium">
                  {flight.origin_airport.code} →{" "}
                  {flight.destination_airport.code}
                </div>
                <div className="text-sm text-muted-foreground">
                  {flight.airline.name} {flight.flight_number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(flight.departure_time), "PPP")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  ${getClassPrice(flight).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">per person</div>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between items-center font-semibold">
            <span>Total ({passengers.length} passengers)</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Passenger Information */}
      <Card>
        <CardHeader>
          <CardTitle>Passenger Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {passengers.map((passenger, index) => (
            <div key={index} className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">
                Passenger {index + 1} ({passenger.passenger_type})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`first_name_${index}`}>First Name *</Label>
                  <Input
                    id={`first_name_${index}`}
                    value={passenger.first_name}
                    onChange={(e) =>
                      updatePassenger(index, "first_name", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`last_name_${index}`}>Last Name *</Label>
                  <Input
                    id={`last_name_${index}`}
                    value={passenger.last_name}
                    onChange={(e) =>
                      updatePassenger(index, "last_name", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !passenger.date_of_birth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {passenger.date_of_birth
                          ? format(new Date(passenger.date_of_birth), "PPP")
                          : "Select date of birth"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          passenger.date_of_birth
                            ? new Date(passenger.date_of_birth)
                            : undefined
                        }
                        onSelect={(date) =>
                          updatePassenger(
                            index,
                            "date_of_birth",
                            date?.toISOString().split("T")[0] || ""
                          )
                        }
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`nationality_${index}`}>Nationality</Label>
                  <Select
                    value={passenger.nationality || ""}
                    onValueChange={(value) =>
                      updatePassenger(index, "nationality", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`passport_${index}`}>Passport Number</Label>
                <Input
                  id={`passport_${index}`}
                  value={passenger.passport_number || ""}
                  onChange={(e) =>
                    updatePassenger(index, "passport_number", e.target.value)
                  }
                  placeholder="Optional for domestic flights"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={contactInfo.email}
                onChange={(e) =>
                  setContactInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={contactInfo.phone}
                onChange={(e) =>
                  setContactInfo((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Step */}
      {showPayment && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details (Mock)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Autofill if saved cards exist */}
            {savedCards.length > 0 && (
              <div className="mb-4">
                <Label>Saved Cards:</Label>
                <div className="flex flex-col gap-2 mt-2">
                  {savedCards.map((card) => (
                    <button
                      type="button"
                      key={card.id}
                      className="border rounded px-3 py-2 text-left hover:bg-gray-100"
                      onClick={() => {
                        setSelectedSavedCard(card);
                        setPaymentDetails({
                          cardNumber: `**** **** **** ${card.card_last4}`,
                          expiry: card.card_expiry,
                          cvv: "",
                          name: card.card_name,
                        });
                      }}
                    >
                      {card.card_name} •••• {card.card_last4} (exp{" "}
                      {card.card_expiry})
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  For security, card number and CVV must be re-entered.
                </div>
                {selectedSavedCard && (
                  <div className="text-xs text-blue-600 mt-1">
                    Using saved card: {selectedSavedCard.card_name} ••••{" "}
                    {selectedSavedCard.card_last4}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => {
                    if (selectedSavedCard) {
                      // Only allow editing the part before the last 4 digits
                      const input = e.target.value.replace(/\s+/g, "");
                      const fixedLast4 = selectedSavedCard.card_last4;
                      // Remove non-digits and split
                      let editable = input.slice(0, -4);
                      // Format as **** **** **** 1234
                      let formatted = editable
                        .replace(/[^0-9]/g, "")
                        .replace(/(.{4})/g, "$1 ")
                        .trim();
                      if (formatted.length > 0) formatted += " ";
                      formatted += fixedLast4;
                      setPaymentDetails({
                        ...paymentDetails,
                        cardNumber: formatted,
                      });
                    } else {
                      setPaymentDetails({
                        ...paymentDetails,
                        cardNumber: e.target.value,
                      });
                    }
                    if (
                      selectedSavedCard &&
                      !e.target.value.endsWith(selectedSavedCard.card_last4)
                    ) {
                      setSelectedSavedCard(null);
                    }
                  }}
                  required
                  maxLength={19}
                  placeholder="1234 5678 9012 3456"
                  // Not readOnly, but restrict last 4 digits
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name on Card *</Label>
                <Input
                  id="name"
                  value={paymentDetails.name}
                  onChange={(e) => {
                    setPaymentDetails({
                      ...paymentDetails,
                      name: e.target.value,
                    });
                    if (selectedSavedCard) setSelectedSavedCard(null);
                  }}
                  required
                  placeholder="John Doe"
                  readOnly={!!selectedSavedCard}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry (MM/YY) *</Label>
                <Input
                  id="expiry"
                  value={paymentDetails.expiry}
                  onChange={(e) => {
                    setPaymentDetails({
                      ...paymentDetails,
                      expiry: e.target.value,
                    });
                    if (selectedSavedCard) setSelectedSavedCard(null);
                  }}
                  required
                  maxLength={5}
                  placeholder="12/34"
                  readOnly={!!selectedSavedCard}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  value={paymentDetails.cvv}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      cvv: e.target.value,
                    })
                  }
                  required
                  maxLength={4}
                  placeholder="123"
                  type="password"
                />
              </div>
            </div>
            {/* Only show save payment option if not using a saved card */}
            {!selectedSavedCard && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="savePayment"
                  checked={savePayment}
                  onChange={(e) => setSavePayment(e.target.checked)}
                />
                <Label htmlFor="savePayment">
                  Save payment details for future bookings (masked)
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-4">
              <Label>Payment Outcome:</Label>
              <select
                value={paymentOutcome}
                onChange={(e) =>
                  setPaymentOutcome(e.target.value as "success" | "fail")
                }
                className="border rounded px-2 py-1"
              >
                <option value="success">Success</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            {paymentError && (
              <div className="text-destructive text-sm">{paymentError}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              Pay & Complete Booking
            </Button>
          </CardContent>
        </Card>
      )}
      {!showPayment && (
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !isFormValid()}
        >
          Continue to Payment
        </Button>
      )}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Update Required</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-base">{changeMessage}</div>
          {pendingPayment && (
            <div className="py-2 text-base text-blue-600 font-semibold">
              Please confirm to proceed with the new price.
            </div>
          )}
          <DialogFooter>
            {pendingPayment ? (
              <Button
                onClick={async () => {
                  setShowChangeModal(false);
                  setPendingPayment(false);
                  setPaymentProcessing(true);
                  // Proceed with payment after user confirmation
                  setTimeout(async () => {
                    setPaymentProcessing(false);
                    setPaymentResult(paymentOutcome);
                    if (paymentOutcome === "fail") {
                      setPaymentError(
                        "Payment failed. Please try again or select 'Success' to test success flow."
                      );
                      return;
                    }
                    let maskedCard = undefined;
                    if (savePayment && user?.id) {
                      maskedCard = {
                        cardNumber: `**** **** **** ${paymentDetails.cardNumber.slice(
                          -4
                        )}`,
                        expiry: paymentDetails.expiry,
                        cvv: "***",
                        name: paymentDetails.name,
                      };
                      await fetch(`${API_BASE}/saved-payments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          user_id: user.id,
                          card_last4: paymentDetails.cardNumber.slice(-4),
                          card_expiry: paymentDetails.expiry,
                          card_name: paymentDetails.name,
                        }),
                      });
                    }
                    onSubmit(passengers, contactInfo, maskedCard);
                  }, 2000);
                }}
              >
                Confirm & Pay
              </Button>
            ) : (
              <Button onClick={() => window.location.reload()}>
                Return to Search
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showBookingErrorModal}
        onOpenChange={setShowBookingErrorModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Failed</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-base text-destructive">
            {bookingErrorMessage}
          </div>
          <DialogFooter>
            <Button onClick={() => window.location.reload()}>
              Return to Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
