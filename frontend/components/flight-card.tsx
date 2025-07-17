"use client";

import { Clock, Plane, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Flight } from "@/lib/types";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  selected?: boolean;
  cabinClass: "economy" | "premium_economy" | "business" | "first_class";
  passengerCount: number;
}

export function FlightCard({
  flight,
  onSelect,
  selected,
  cabinClass,
  passengerCount,
}: FlightCardProps) {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-green-100 text-green-800";
      case "delayed":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAvailableSeats = () => {
    switch (cabinClass) {
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

  const getClassLabel = () => {
    switch (cabinClass) {
      case "economy":
        return "Economy";
      case "premium_economy":
        return "Premium Economy";
      case "business":
        return "Business";
      case "first_class":
        return "First Class";
      default:
        return "";
    }
  };

  // Add a function to get the price for the selected class
  const getClassPrice = () => {
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
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold">{flight.airline.name}</div>
              <div className="text-sm text-muted-foreground">
                {flight.flight_number}
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(flight.status)}>
            {flight.status.charAt(0).toUpperCase() + flight.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatTime(flight.departure_time)}
            </div>
            <div className="text-sm text-muted-foreground">
              {flight.origin_airport?.code || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {flight.origin_airport?.city || "-"}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="w-8 h-px bg-border"></div>
              <Clock className="w-4 h-4" />
              <div className="w-8 h-px bg-border"></div>
            </div>
            <div className="text-sm mt-1">
              {formatDuration(flight.duration)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatTime(flight.arrival_time)}
            </div>
            <div className="text-sm text-muted-foreground">
              {flight.destination_airport?.code || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {flight.destination_airport?.city || "-"}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between min-w-0 gap-2">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground min-w-0 flex-shrink break-words w-full md:w-auto">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>
                {getAvailableSeats()} seats ({getClassLabel()})
              </span>
            </div>
            <div>{flight.aircraft.model}</div>
          </div>
          <div className="text-right flex-none w-full md:w-auto">
            <div className="text-2xl font-bold text-primary">
              ${getClassPrice().toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">per person</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex flex-col gap-2">
        {getAvailableSeats() < passengerCount ? (
          <>
            <span className="w-full block">
              <span
                className={`w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 bg-gray-200 text-gray-400 cursor-not-allowed select-none`}
              >
                Select Flight
              </span>
            </span>
            <span className="text-xs text-destructive text-center mt-1">
              {getAvailableSeats() === 0
                ? "No seats available in this class."
                : `Only ${getAvailableSeats()} seats available, but you searched for ${passengerCount}.`}
            </span>
          </>
        ) : (
          <Button
            onClick={() => onSelect(flight)}
            className="w-full"
            variant={selected ? "default" : "outline"}
          >
            {selected ? "Selected" : "Select Flight"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
