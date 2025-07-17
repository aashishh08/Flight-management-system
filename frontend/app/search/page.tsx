"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FlightCard } from "@/components/flight-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Filter, SortAsc } from "lucide-react";
import type { Flight, SearchParams } from "@/lib/types";
import { flightService } from "@/lib/flight-service";
import { useFlightWorker } from "@/hooks/useFlightWorker";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [outboundFlights, setOutboundFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);
  const [sortOption, setSortOption] = useState<
    "price-asc" | "price-desc" | null
  >(null);
  const [showSort, setShowSort] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const searchQuery: SearchParams = {
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    departureDate: searchParams.get("departureDate") || "",
    returnDate: searchParams.get("returnDate") || undefined,
    passengers: {
      adults: Number.parseInt(searchParams.get("adults") || "1"),
      children: Number.parseInt(searchParams.get("children") || "0"),
      infants: Number.parseInt(searchParams.get("infants") || "0"),
    },
    cabinClass: (searchParams.get("cabinClass") as any) || "economy",
    tripType: (searchParams.get("tripType") as any) || "round-trip",
  };

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        setLoading(true);
        setError(null);
        if (searchQuery.tripType === "round-trip" && searchQuery.returnDate) {
          // Fetch outbound flights
          const outbound = await flightService.searchFlights({
            ...searchQuery,
            origin: searchQuery.origin,
            destination: searchQuery.destination,
            departureDate: searchQuery.departureDate,
            tripType: "one-way",
            returnDate: undefined,
          });
          setOutboundFlights(outbound);
          // Fetch return flights
          const ret = await flightService.searchFlights({
            ...searchQuery,
            origin: searchQuery.destination,
            destination: searchQuery.origin,
            departureDate: searchQuery.returnDate,
            tripType: "one-way",
            returnDate: undefined,
          });
          setReturnFlights(ret);
        } else {
          // One-way
          const outbound = await flightService.searchFlights(searchQuery);
          setOutboundFlights(outbound);
          setReturnFlights([]);
        }
      } catch (err) {
        setError("Failed to search flights. Please try again.");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (
      searchQuery.origin &&
      searchQuery.destination &&
      searchQuery.departureDate
    ) {
      fetchFlights();
    }
  }, [searchParams]);

  const handleContinueBooking = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to continue with your booking.",
      });
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
      return;
    }
    if (
      searchQuery.tripType === "round-trip" &&
      selectedOutbound &&
      selectedReturn
    ) {
      const bookingParams = new URLSearchParams({
        flightId: selectedOutbound.id,
        returnFlightId: selectedReturn.id,
        adults: searchQuery.passengers.adults.toString(),
        children: searchQuery.passengers.children.toString(),
        infants: searchQuery.passengers.infants.toString(),
        cabinClass: searchQuery.cabinClass,
      });
      router.push(`/booking?${bookingParams.toString()}`);
    } else if (selectedOutbound) {
      // SAFEGUARD: For one-way, never include returnFlightId
      const bookingParams = new URLSearchParams({
        flightId: selectedOutbound.id,
        adults: searchQuery.passengers.adults.toString(),
        children: searchQuery.passengers.children.toString(),
        infants: searchQuery.passengers.infants.toString(),
        cabinClass: searchQuery.cabinClass,
      });
      // Explicitly do NOT add returnFlightId for one-way, even if selectedReturn is set
      router.push(`/booking?${bookingParams.toString()}`);
    }
  };

  const totalPassengers =
    searchQuery.passengers.adults +
    searchQuery.passengers.children +
    searchQuery.passengers.infants;

  // Helper to get available seats for a flight and class
  const getAvailableSeats = (flight: Flight | null) => {
    if (!flight) return 0;
    switch (searchQuery.cabinClass) {
      case "economy":
        return flight.available_economy;
      case "premium_economy":
        return flight.available_premium_economy;
      case "business":
        return flight.available_business;
      case "first_class":
        return flight.available_first_class;
      default:
        return 0;
    }
  };

  // Helper to get the price for the selected class
  const getClassPrice = (flight: Flight) => {
    switch (searchQuery.cabinClass) {
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
  };

  // Helper to sort flights (keep for fallback)
  const processFlights = (flights: Flight[]) => {
    let sorted = flights;
    if (sortOption === "price-asc") {
      sorted = [...sorted].sort((a, b) => getClassPrice(a) - getClassPrice(b));
    } else if (sortOption === "price-desc") {
      sorted = [...sorted].sort((a, b) => getClassPrice(b) - getClassPrice(a));
    }
    return sorted;
  };

  // --- Web Worker Integration ---
  const outboundWorker = useFlightWorker(
    outboundFlights,
    {
      origin: searchQuery.origin,
      destination: searchQuery.destination,
      departureDate: searchQuery.departureDate,
      cabinClass: searchQuery.cabinClass,
      passengers: totalPassengers,
    },
    sortOption === "price-asc"
      ? "price"
      : sortOption === "price-desc"
      ? "-price"
      : undefined
  );

  const returnWorker = useFlightWorker(
    returnFlights,
    {
      origin: searchQuery.destination,
      destination: searchQuery.origin,
      departureDate: searchQuery.returnDate,
      cabinClass: searchQuery.cabinClass,
      passengers: totalPassengers,
    },
    sortOption === "price-asc"
      ? "price"
      : sortOption === "price-desc"
      ? "-price"
      : undefined
  );
  // --- End Web Worker Integration ---

  // Ideal UX flow logic
  const isRoundTrip =
    searchQuery.tripType === "round-trip" && searchQuery.returnDate;
  const noDepartureFlights =
    isRoundTrip && outboundFlights.length === 0 && !loading;
  const noReturnFlights = isRoundTrip && returnFlights.length === 0 && !loading;
  const bothAvailable =
    isRoundTrip && outboundFlights.length > 0 && returnFlights.length > 0;

  if (
    !searchQuery.origin ||
    !searchQuery.destination ||
    !searchQuery.departureDate
  ) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Invalid search parameters. Please go back and search again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (noDepartureFlights) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            No departure flights found for your selected date. Please change
            your departure date to continue with a round-trip booking.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (noReturnFlights) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-auto p-8 text-center shadow-lg">
          <CardContent>
            <div className="text-2xl font-bold text-destructive mb-4">
              No return flights found
            </div>
            <div className="text-muted-foreground mb-6">
              We couldn't find any return flights for your selected date.
              <br />
              You can proceed with a one-way booking or change your return date.
            </div>
            <Button
              size="lg"
              className="w-full mb-2"
              onClick={() => {
                // Switch to one-way booking
                const params = new URLSearchParams(
                  Array.from(searchParams.entries())
                );
                params.set("tripType", "one-way");
                router.replace(`/search?${params.toString()}`);
              }}
            >
              Proceed with One-Way
            </Button>
            <div className="text-sm text-muted-foreground mt-2">
              Or go back and select a different return date.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSort((v) => !v)}
                >
                  <SortAsc className="w-4 h-4 mr-2" />
                  Sort
                </Button>
                {showSort && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        sortOption === "price-asc" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setSortOption("price-asc");
                        setShowSort(false);
                      }}
                    >
                      Price: Low to High
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        sortOption === "price-desc" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setSortOption("price-desc");
                        setShowSort(false);
                      }}
                    >
                      Price: High to Low
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        !sortOption ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setSortOption(null);
                        setShowSort(false);
                      }}
                    >
                      Default
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-4 py-8`}>
        <div
          className={`grid grid-cols-1 ${
            searchQuery.tripType === "round-trip" && searchQuery.returnDate
              ? "lg:grid-cols-3"
              : "lg:grid-cols-2"
          } gap-8`}
        >
          {/* Search Summary */}
          <div className="lg:col-span-full">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-semibold">
                      {searchQuery.origin} → {searchQuery.destination}
                    </div>
                    <Badge variant="secondary">
                      {searchQuery.tripType === "round-trip"
                        ? "Round Trip"
                        : "One Way"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {totalPassengers}{" "}
                      {totalPassengers === 1 ? "passenger" : "passengers"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {searchQuery.tripType === "round-trip"
                      ? `${outboundFlights.length} outbound, ${returnFlights.length} return flights found`
                      : `${outboundFlights.length} flights found`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outbound Flights */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Departure Flight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div>Loading flights...</div>
                ) : error ? (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : outboundFlights.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No departure flights found.
                  </div>
                ) : (
                  (outboundWorker.result?.length
                    ? outboundWorker.result
                    : processFlights(outboundFlights)
                  ).map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      onSelect={() => setSelectedOutbound(flight)}
                      selected={selectedOutbound?.id === flight.id}
                      cabinClass={searchQuery.cabinClass}
                      passengerCount={totalPassengers}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Return Flights (only for round-trip) */}
          {searchQuery.tripType === "round-trip" && searchQuery.returnDate && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Return Flight</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div>Loading flights...</div>
                  ) : error ? (
                    <Alert>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : returnFlights.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No return flights found.
                    </div>
                  ) : (
                    (returnWorker.result?.length
                      ? returnWorker.result
                      : processFlights(returnFlights)
                    ).map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        onSelect={() => setSelectedReturn(flight)}
                        selected={selectedReturn?.id === flight.id}
                        cabinClass={searchQuery.cabinClass}
                        passengerCount={totalPassengers}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {searchQuery.tripType === "round-trip" &&
                  selectedOutbound &&
                  selectedReturn ? (
                    <>
                      <div className="space-y-2">
                        <div className="font-medium">Departure Flight</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedOutbound.airline.name}{" "}
                          {selectedOutbound.flight_number}
                        </div>
                        <div className="text-sm">
                          {selectedOutbound.origin_airport?.code} →{" "}
                          {selectedOutbound.destination_airport?.code}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium">Return Flight</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedReturn.airline.name}{" "}
                          {selectedReturn.flight_number}
                        </div>
                        <div className="text-sm">
                          {selectedReturn.origin_airport?.code} →{" "}
                          {selectedReturn.destination_airport?.code}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Class Price</span>
                          <span>
                            ${getClassPrice(selectedOutbound).toFixed(2)} + $
                            {getClassPrice(selectedReturn).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passengers</span>
                          <span>×{totalPassengers}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>
                            $
                            {(
                              (getClassPrice(selectedOutbound) +
                                getClassPrice(selectedReturn)) *
                              totalPassengers
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={handleContinueBooking}
                        className="w-full"
                        disabled={
                          !selectedOutbound ||
                          (searchQuery.tripType === "round-trip" &&
                            !selectedReturn) ||
                          getAvailableSeats(selectedOutbound) === 0 ||
                          (searchQuery.tripType === "round-trip" &&
                            getAvailableSeats(selectedReturn) === 0)
                        }
                      >
                        Continue to Booking
                      </Button>
                    </>
                  ) : searchQuery.tripType === "one-way" && selectedOutbound ? (
                    <>
                      <div className="space-y-2">
                        <div className="font-medium">Selected Flight</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedOutbound.airline.name}{" "}
                          {selectedOutbound.flight_number}
                        </div>
                        <div className="text-sm">
                          {selectedOutbound.origin_airport?.code} →{" "}
                          {selectedOutbound.destination_airport?.code}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Class Price</span>
                          <span>
                            ${getClassPrice(selectedOutbound).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passengers</span>
                          <span>×{totalPassengers}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>
                            $
                            {(
                              getClassPrice(selectedOutbound) * totalPassengers
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={handleContinueBooking}
                        className="w-full"
                        disabled={!selectedOutbound}
                      >
                        Continue to Booking
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery.tripType === "round-trip"
                        ? "Select a departure and return flight to continue"
                        : "Select a flight to continue"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
