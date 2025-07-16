"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, Calendar, CreditCard, MapPin, Clock } from "lucide-react";
import type { Booking } from "@/lib/types";
import { bookingService } from "@/lib/booking-service";
import { authService } from "@/lib/auth";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFlightStatusSSE } from "@/lib/flight-service";

export default function DashboardPage() {
  // All hooks at the top!
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<{ [flightId: string]: any }>(
    {}
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        await authService.signOut();
        router.push("/auth/login");
        return;
      }
    })();
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userBookings = await bookingService.getUserBookings(user.id);
        setBookings(userBookings || []);
        // Fetch latest status for each upcoming flight
        const flightIds = Array.from(
          new Set(
            (userBookings || [])
              .filter(
                (booking) =>
                  booking.status !== "cancelled" &&
                  booking.flight_bookings.some(
                    (fb) => new Date(fb.flight.departure_time) > new Date()
                  )
              )
              .map((b) => b.flight_bookings[0]?.flight?.id)
              .filter(Boolean)
          )
        );
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
        const statusResults = await Promise.all(
          flightIds.map(async (flightId) => {
            try {
              const res = await fetch(
                `${API_BASE}/flights/${flightId}/latest-status`
              );
              if (!res.ok) return null;
              const data = await res.json();
              return { flightId, status: data.status };
            } catch {
              return null;
            }
          })
        );
        const statusMap: Record<string, { status: string }> = {};
        statusResults.forEach((item) => {
          if (item && item.flightId && item.status) {
            statusMap[item.flightId] = { status: item.status };
          }
        });
        setLiveStatuses((prev) => ({ ...statusMap, ...prev }));
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user, authLoading, router]);

  useEffect(() => {
    // Get all unique upcoming flight IDs
    const flightIds = Array.from(
      new Set(
        bookings
          .filter(
            (booking) =>
              booking.status !== "cancelled" &&
              booking.flight_bookings.some(
                (fb) => new Date(fb.flight.departure_time) > new Date()
              )
          )
          .map((b) => b.flight_bookings[0]?.flight?.id)
          .filter(Boolean)
      )
    );
    const sources: { [flightId: string]: EventSource } = {};
    let isMounted = true;
    flightIds.forEach((flightId) => {
      if (!flightId) return;
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
      // Fixed: do not duplicate /api in the path
      const url = `${API_BASE}/flight-status?flightId=${flightId}`;
      const es = new EventSource(url);
      sources[flightId] = es;
      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          setLiveStatuses((prev) => ({ ...prev, [flightId]: data }));
        } catch {}
      };
      es.onerror = () => {
        es.close();
      };
    });
    return () => {
      isMounted = false;
      Object.values(sources).forEach((es) => es.close());
    };
  }, [
    JSON.stringify(
      bookings
        .filter(
          (booking) =>
            booking.status !== "cancelled" &&
            booking.flight_bookings.some(
              (fb) => new Date(fb.flight.departure_time) > new Date()
            )
        )
        .map((b) => b.flight_bookings[0]?.flight?.id)
        .filter(Boolean)
    ),
  ]);

  // Early returns after all hooks
  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }
  if (!user) {
    return null;
  }

  // Compute derived variables after early returns
  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      booking.flight_bookings.some(
        (fb) => new Date(fb.flight.departure_time) > new Date()
      )
  );

  const pastBookings = bookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      booking.flight_bookings.every(
        (fb) => new Date(fb.flight.departure_time) <= new Date()
      )
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "cancelled"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your bookings</p>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Plane className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{bookings.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Total Bookings
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {upcomingBookings.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Upcoming Trips
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <MapPin className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {
                      new Set(
                        bookings.flatMap((b) =>
                          b.flight_bookings.map(
                            (fb) => fb.flight.destination_airport.city
                          )
                        )
                      ).size
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cities Visited
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    $
                    {bookings
                      .reduce((sum, b) => sum + b.total_amount, 0)
                      .toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Spent
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Trips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No upcoming trips
                    </div>
                  ) : (
                    upcomingBookings.map((booking) => {
                      const flight = booking.flight_bookings[0]?.flight;
                      return (
                        <div key={booking.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">
                                {flight?.origin_airport.code} →{" "}
                                {flight?.destination_airport.code}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {flight?.airline.name} {flight?.flight_number}
                              </div>
                            </div>
                            <Badge>
                              {liveStatuses[flight?.id]?.status ||
                                booking.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "PPP"
                                  )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "HH:mm"
                                  )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/booking/confirmation/${booking.id}`
                                )
                              }
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Past Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Past Trips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pastBookings.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No past trips
                    </div>
                  ) : (
                    pastBookings.slice(0, 5).map((booking) => {
                      const flight = booking.flight_bookings[0]?.flight;
                      return (
                        <div key={booking.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">
                                {flight?.origin_airport.code} →{" "}
                                {flight?.destination_airport.code}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {flight?.airline.name} {flight?.flight_number}
                              </div>
                            </div>
                            <Badge variant="secondary">{booking.status}</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "PPP"
                                  )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "HH:mm"
                                  )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/booking/confirmation/${booking.id}`
                                )
                              }
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Cancelled Bookings */}
              {cancelledBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cancelled Bookings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cancelledBookings.map((booking) => {
                      const flight = booking.flight_bookings[0]?.flight;
                      return (
                        <div
                          key={booking.id}
                          className="border rounded-lg p-4 opacity-60"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">
                                {flight?.origin_airport.code} →{" "}
                                {flight?.destination_airport.code}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {flight?.airline.name} {flight?.flight_number}
                              </div>
                            </div>
                            <Badge variant="destructive">Cancelled</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "PPP"
                                  )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {flight &&
                                  format(
                                    new Date(flight.departure_time),
                                    "HH:mm"
                                  )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/booking/confirmation/${booking.id}`
                                )
                              }
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
