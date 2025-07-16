import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing flight ID" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data: flight, error } = await supabase
      .from("flights")
      .select(
        `*, airline:airlines(*), aircraft:aircraft(*), origin_airport:airports!flights_origin_airport_id_fkey(*), destination_airport:airports!flights_destination_airport_id_fkey(*)`
      )
      .eq("id", id)
      .single();

    if (error || !flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    return NextResponse.json(flight);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch flight" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing flight ID" }, { status: 400 });
  }
  let status;
  try {
    const body = await request.json();
    status = body.status;
    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("flights")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "Flight not found or update failed" },
        { status: 404 }
      );
    }
    // Insert a new log into flight_status_logs
    await supabase.from("flight_status_logs").insert([
      {
        flight_id: id,
        status,
        updated_at: new Date().toISOString(),
      },
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update flight status" },
      { status: 500 }
    );
  }
}
