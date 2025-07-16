import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const departureDate = searchParams.get("departureDate");
  const cabinClass = searchParams.get("cabinClass") || "economy";

  if (!origin || !destination || !departureDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    // First, get the airport IDs for the given codes
    const { data: originAirport, error: originError } = await supabase
      .from("airports")
      .select("id")
      .eq("code", origin)
      .single();
    const { data: destinationAirport, error: destError } = await supabase
      .from("airports")
      .select("id")
      .eq("code", destination)
      .single();
    if (originError || destError || !originAirport || !destinationAirport) {
      return NextResponse.json([], { status: 200 });
    }

    let query = supabase
      .from("flights")
      .select(
        `*,
        airline:airlines(*),
        aircraft:aircraft(*),
        origin_airport:airports!flights_origin_airport_id_fkey(*),
        destination_airport:airports!flights_destination_airport_id_fkey(*)
      `
      )
      .eq("origin_airport_id", originAirport.id)
      .eq("destination_airport_id", destinationAirport.id)
      .gte("departure_time", departureDate)
      .lt(
        "departure_time",
        new Date(
          new Date(departureDate).getTime() + 24 * 60 * 60 * 1000
        ).toISOString()
      )
      .eq("status", "scheduled")
      .order("departure_time");

    // Add class availability filter
    if (cabinClass === "economy") {
      query = query.gt("available_economy", 0);
    } else if (cabinClass === "premium_economy") {
      query = query.gt("available_premium_economy", 0);
    } else if (cabinClass === "business") {
      query = query.gt("available_business", 0);
    } else if (cabinClass === "first_class") {
      query = query.gt("available_first_class", 0);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Flight search error:", error);
    return NextResponse.json(
      { error: "Failed to search flights" },
      { status: 500 }
    );
  }
}
