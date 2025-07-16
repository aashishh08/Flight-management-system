import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("airports").select("*");
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "No airports exist" }, { status: 404 });
  }
  return NextResponse.json(data);
}
