"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlightSearchForm } from "@/components/flight-search-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchParams } from "@/lib/types";
import { Plane, MapPin, Clock, Star } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);

    // Create URL search params
    const searchParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      adults: params.passengers.adults.toString(),
      children: params.passengers.children.toString(),
      infants: params.passengers.infants.toString(),
      cabinClass: params.cabinClass,
      tripType: params.tripType,
    });

    if (params.returnDate) {
      searchParams.set("returnDate", params.returnDate);
    }

    router.push(`/search?${searchParams.toString()}`);
  };

  const popularDestinations = [
    { code: "LAX", city: "Los Angeles", country: "USA", price: 299 },
    { code: "LHR", city: "London", country: "UK", price: 599 },
    { code: "CDG", city: "Paris", country: "France", price: 649 },
    { code: "DXB", city: "Dubai", country: "UAE", price: 799 },
    { code: "NRT", city: "Tokyo", country: "Japan", price: 899 },
    { code: "SIN", city: "Singapore", country: "Singapore", price: 749 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Plane className="w-8 h-8" />
              <h1 className="text-4xl md:text-6xl font-bold">SkyBooker</h1>
            </div>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
              Discover amazing destinations and book your perfect flight with
              ease
            </p>
            <div className="flex items-center justify-center space-x-6 text-blue-100">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 fill-current" />
                <span>Best Prices</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="container mx-auto px-4 -mt-10 relative z-10">
        <FlightSearchForm onSearch={handleSearch} loading={loading} />
      </div>

      {/* Popular Destinations */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our most popular destinations and find great deals on
            flights
          </p>
        </div>

        {/* Carousel of country cards */}
        <div className="flex justify-center">
          <div className="flex space-x-6 overflow-x-auto pb-4 px-2 max-w-3xl mx-auto">
            {Array.from(new Set(popularDestinations.map((d) => d.country))).map(
              (country) => (
                <Card
                  key={country}
                  className="min-w-[180px] flex-shrink-0 text-center rounded-2xl border-0 shadow-lg bg-gradient-to-br from-blue-400/80 to-indigo-500/80 text-white transform transition-transform duration-200 hover:scale-105 hover:shadow-2xl"
                  style={{ backdropFilter: "blur(4px)" }}
                >
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <span className="text-4xl mb-2">
                      {/* Simple flag emoji for visual appeal */}
                      {country === "USA" && "🇺🇸"}
                      {country === "UK" && "🇬🇧"}
                      {country === "France" && "🇫🇷"}
                      {country === "UAE" && "🇦🇪"}
                      {country === "Japan" && "🇯🇵"}
                      {country === "Singapore" && "🇸🇬"}
                    </span>
                    <span className="text-2xl font-extrabold tracking-wide drop-shadow-lg mb-1">
                      {country}
                    </span>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose SkyBooker?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Prices</h3>
              <p className="text-gray-600">
                We compare prices from hundreds of airlines to find you the best
                deals
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-gray-600">
                Our customer support team is available around the clock to help
                you
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Worldwide Coverage</h3>
              <p className="text-gray-600">
                Book flights to over 1000 destinations across the globe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
