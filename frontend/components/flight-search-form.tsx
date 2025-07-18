"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { SearchParams, Airport } from "@/lib/types";
import { flightService } from "@/lib/flight-service";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FlightSearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

export function FlightSearchForm({ onSearch, loading }: FlightSearchFormProps) {
  const STORAGE_KEY = "flightSearchFormData";

  const [tripType, setTripType] = useState<"one-way" | "round-trip">(
    "round-trip"
  );
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabinClass, setCabinClass] = useState<
    "economy" | "premium_economy" | "business" | "first_class"
  >("economy");
  const [airports, setAirports] = useState<Airport[]>([]);
  const [showReturnDateError, setShowReturnDateError] = useState(false);

  // Restore form state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.tripType) setTripType(data.tripType);
        if (data.origin) setOrigin(data.origin);
        if (data.destination) setDestination(data.destination);
        if (data.departureDate) setDepartureDate(new Date(data.departureDate));
        if (data.returnDate) setReturnDate(new Date(data.returnDate));
        if (data.passengers) setPassengers(data.passengers);
        if (data.cabinClass) setCabinClass(data.cabinClass);
      } catch (e) {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    const loadAirports = async () => {
      try {
        const airportData = await flightService.getAirports();
        setAirports(airportData);
      } catch (error) {
        console.error("Failed to load airports:", error);
      }
    };
    loadAirports();
  }, []);

  const handleSearch = () => {
    setShowReturnDateError(false);
    if (!origin || !destination || !departureDate) {
      return;
    }
    if (tripType === "round-trip" && !returnDate) {
      setShowReturnDateError(true);
      return;
    }

    // Format date in local time (YYYY-MM-DD)
    function formatDateLocal(date: Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const searchParams: SearchParams = {
      origin,
      destination,
      departureDate: formatDateLocal(departureDate),
      returnDate:
        tripType === "round-trip" && returnDate
          ? formatDateLocal(returnDate)
          : undefined,
      passengers,
      cabinClass,
      tripType,
    };

    // Save form state to localStorage
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tripType,
        origin,
        destination,
        departureDate: departureDate ? departureDate.toISOString() : undefined,
        returnDate: returnDate ? returnDate.toISOString() : undefined,
        passengers,
        cabinClass,
      })
    );

    onSearch(searchParams);
  };

  const totalPassengers =
    passengers.adults + passengers.children + passengers.infants;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <Tabs
          value={tripType}
          onValueChange={(value) =>
            setTripType(value as "one-way" | "round-trip")
          }
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
            <TabsTrigger value="one-way">One Way</TabsTrigger>
          </TabsList>

          <TabsContent value={tripType} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">From</Label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select origin airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((airport) => (
                        <SelectItem key={airport.id} value={airport.code}>
                          {airport.code} - {airport.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">To</Label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select destination airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((airport) => (
                        <SelectItem key={airport.id} value={airport.code}>
                          {airport.code} - {airport.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departure Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {departureDate
                        ? format(departureDate, "PPP")
                        : "Select departure date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={departureDate}
                      onSelect={setDepartureDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {tripType === "round-trip" && (
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate
                          ? format(returnDate, "PPP")
                          : "Select return date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        disabled={(date) =>
                          date < (departureDate || new Date())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passengers</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                    >
                      <UsersIcon className="mr-2 h-4 w-4" />
                      {totalPassengers}{" "}
                      {totalPassengers === 1 ? "Passenger" : "Passengers"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Adults</div>
                          <div className="text-sm text-muted-foreground">
                            12+ years
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                adults: Math.max(1, p.adults - 1),
                              }))
                            }
                            disabled={passengers.adults <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {passengers.adults}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                adults: p.adults + 1,
                              }))
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Children</div>
                          <div className="text-sm text-muted-foreground">
                            2-11 years
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                children: Math.max(0, p.children - 1),
                              }))
                            }
                            disabled={passengers.children <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {passengers.children}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                children: p.children + 1,
                              }))
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Infants</div>
                          <div className="text-sm text-muted-foreground">
                            Under 2 years
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                infants: Math.max(0, p.infants - 1),
                              }))
                            }
                            disabled={passengers.infants <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">
                            {passengers.infants}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPassengers((p) => ({
                                ...p,
                                infants: p.infants + 1,
                              }))
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Cabin Class</Label>
                <Select
                  value={cabinClass}
                  onValueChange={(value) => setCabinClass(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">
                      Premium Economy
                    </SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first_class">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showReturnDateError && (
              <div className="text-destructive text-sm mb-2">
                Please select a return date for round-trip flights.
              </div>
            )}

            <Button
              onClick={handleSearch}
              className="w-full"
              size="lg"
              disabled={loading || !origin || !destination || !departureDate}
            >
              {loading ? "Searching..." : "Search Flights"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
